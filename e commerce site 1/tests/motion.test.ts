import test from "node:test";
import assert from "node:assert/strict";
import { RackMotion, garmentPose, MOTION } from "../src/motion.ts";

function advance(rack: RackMotion, seconds = 3, start = 0) {
  for (let i = 1; i <= Math.ceil(seconds * 120); i++)
    rack.update(1 / 120, start + (i * 1000) / 120);
}

test("high resolution deltas accumulate as fractional rack positions", () => {
  const rack = new RackMotion(3);
  for (let i = 0; i < 10; i++) rack.input(0.012, i * 4);
  assert.ok(Math.abs(rack.target - 0.12) < 1e-10);
  rack.update(1 / 60, 45);
  assert.ok(rack.q > 0 && rack.q < rack.target);
});

test("reversal cancels stale motion immediately", () => {
  const rack = new RackMotion(5);
  rack.input(2, 0);
  rack.update(0.05, 40);
  const before = rack.q;
  rack.input(-0.1, 50);
  assert.ok(rack.target < before);
  rack.update(0.05, 100);
  assert.ok(rack.q < before);
});

test("input snaps only after its idle period and settles to a garment", () => {
  const rack = new RackMotion(3);
  rack.input(0.63, 0);
  rack.update(1 / 60, 100);
  assert.equal(rack.target, 0.63);
  advance(rack);
  assert.equal(rack.q, 1);
  assert.equal(rack.velocity, 0);
});

test("release velocity continues briefly and remains finite", () => {
  const rack = new RackMotion(3);
  rack.input(0.3, 0);
  rack.release(6, 10);
  rack.update(0.05, 60);
  assert.ok(rack.target > 0.3);
  advance(rack, 4, 60);
  assert.equal(rack.q, 1);
});

test("finite boundaries tell the caller to allow outward page scrolling", () => {
  const rack = new RackMotion(3);
  assert.equal(rack.input(-0.2), false);
  assert.equal(rack.input(0.2), true);
  rack.select(2);
  advance(rack);
  assert.equal(rack.input(0.2), false);
  assert.equal(rack.input(-0.2), true);
});

test("empty and single-item collections remain stable", () => {
  for (const count of [0, 1]) {
    const rack = new RackMotion(count);
    rack.select(40);
    rack.release(7);
    advance(rack);
    assert.equal(rack.q, 0);
    assert.equal(rack.input(0.2), false);
  }
  const rack = new RackMotion(5);
  rack.select(4);
  advance(rack);
  rack.setCount(1);
  assert.equal(rack.q, 0);
});

test("large tab-pause dt cannot destabilize the spring", () => {
  const rack = new RackMotion(3);
  rack.select(2, 0);
  rack.update(120, 120000);
  assert.ok(Number.isFinite(rack.q));
  assert.ok(rack.q > 0 && rack.q < 2);
  advance(rack, 3, 120000);
  assert.equal(rack.q, 2);
});

test("both adjacent garments share the continuous turn", () => {
  const left = garmentPose(-0.5);
  const right = garmentPose(0.5);
  assert.equal(left.angle, -right.angle);
  assert.ok(right.angle > 0 && right.angle < MOTION.sideAngle);
  for (const boundary of [0, 0.5, 1, 2]) {
    const before = garmentPose(boundary - 0.00001);
    const after = garmentPose(boundary + 0.00001);
    assert.ok(Math.abs(after.angle - before.angle) < 0.0001);
    assert.ok(Math.abs(after.x - before.x) < 0.0001);
    assert.equal(after.z, 0);
  }
});

test("reduced motion suppresses overshoot and inertia", () => {
  const rack = new RackMotion(3);
  rack.reducedMotion = true;
  rack.select(1, 0);
  rack.release(7, 0);
  let prior = 0;
  for (let i = 1; i <= 200; i++) {
    rack.update(1 / 60, (i * 1000) / 60);
    assert.ok(rack.q >= prior && rack.q <= 1);
    assert.equal(rack.acceleration, 0);
    prior = rack.q;
  }
  assert.equal(rack.q, 1);
});
