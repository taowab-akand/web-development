/** Tune the whole rack here. Distances are garment slots, angles are radians. */
export const MOTION = {
  wheelSensitivity: 0.0024,
  dragSensitivity: 0.005,
  stiffness: 120,
  damping: 23,
  snapIdleMs: 160,
  sideAngle: (82 * Math.PI) / 180,
  spacing: 1.85,
  distantSpacing: 0.58,
  maximumSway: (4 * Math.PI) / 180,
  momentumDecay: 11,
  maxReleaseVelocity: 7,
} as const;

const clamp = (n: number, low: number, high: number) =>
  Math.max(low, Math.min(high, n));
const smoothstep = (n: number) => n * n * (3 - 2 * n);
const clock = () => performance.now();

/** Continuous, finite, frame-rate independent rack position. No React state. */
export class RackMotion {
  q = 0;
  target = 0;
  velocity = 0;
  acceleration = 0;
  lastInput = -Infinity;
  count: number;
  reducedMotion = false;
  private momentum = 0;
  private direction = 0;

  constructor(count: number) {
    this.count = Math.max(0, Math.floor(count));
  }

  get max() {
    return Math.max(0, this.count - 1);
  }
  get selectedIndex() {
    return clamp(Math.round(this.q), 0, this.max);
  }

  setCount(count: number, selectedIndex?: number) {
    this.count = Math.max(0, Math.floor(count));
    if (selectedIndex !== undefined) {
      this.q = this.target = clamp(selectedIndex, 0, this.max);
      this.velocity = this.momentum = this.acceleration = 0;
    } else {
      this.q = clamp(this.q, 0, this.max);
      this.target = clamp(this.target, 0, this.max);
    }
    if (this.count < 2) this.stop();
  }

  /** Returns false at an outward boundary so wheel handlers can allow page scroll. */
  input(delta: number, now = clock()): boolean {
    if (!Number.isFinite(delta) || delta === 0 || this.count < 2) return false;
    if (
      (delta < 0 && this.target <= 0) ||
      (delta > 0 && this.target >= this.max)
    )
      return false;
    const nextDirection = Math.sign(delta);
    // A reversal discards an old lead; the user never waits for a queued turn.
    if (
      this.direction &&
      nextDirection !== this.direction &&
      now - this.lastInput < 350
    ) {
      this.target = this.q;
      this.velocity = 0;
    }
    this.direction = nextDirection;
    this.momentum = 0;
    this.lastInput = now;
    this.target = clamp(this.target + delta, 0, this.max);
    return true;
  }

  step(direction: number, now = clock()) {
    this.select(Math.round(this.target) + Math.sign(direction), now);
  }

  select(index: number, now = clock()) {
    this.target = clamp(
      Number.isFinite(index) ? Math.round(index) : 0,
      0,
      this.max,
    );
    this.lastInput = now;
    this.momentum = 0;
    this.direction = 0;
  }

  release(velocity: number, now = clock()) {
    this.lastInput = now;
    this.momentum =
      this.reducedMotion || !Number.isFinite(velocity)
        ? 0
        : clamp(
            velocity,
            -MOTION.maxReleaseVelocity,
            MOTION.maxReleaseVelocity,
          );
  }

  stop() {
    this.target = this.q = clamp(this.q, 0, this.max);
    this.velocity = this.momentum = this.acceleration = 0;
    this.direction = 0;
  }

  update(dt: number, now = clock()) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // Discard elapsed background-tab time; integrate in stable 120 Hz substeps.
    const elapsed = Math.min(dt, 0.05);
    const steps = Math.max(1, Math.ceil(elapsed / (1 / 120)));
    const h = elapsed / steps;
    const idle = now - this.lastInput > MOTION.snapIdleMs;
    for (let i = 0; i < steps; i++) {
      if (idle) {
        this.target = Math.round(this.target);
        this.momentum = 0;
      } else if (this.momentum) {
        this.target = clamp(this.target + this.momentum * h, 0, this.max);
        this.momentum *= Math.exp(-MOTION.momentumDecay * h);
      }
      if (this.reducedMotion) {
        // Monotonic damping keeps navigation, but removes overshoot and inertia.
        const prior = this.q;
        this.q += (this.target - this.q) * (1 - Math.exp(-24 * h));
        this.velocity = (this.q - prior) / h;
        this.acceleration = 0;
      } else {
        this.acceleration =
          MOTION.stiffness * (this.target - this.q) -
          MOTION.damping * this.velocity;
        this.velocity += this.acceleration * h;
        this.q = clamp(this.q + this.velocity * h, 0, this.max);
      }
    }
    if (
      Math.abs(this.q - this.target) < 0.00005 &&
      Math.abs(this.velocity) < 0.0005
    ) {
      this.q = this.target;
      this.velocity = this.acceleration = 0;
    }
  }
}

/** Symmetric sliding/turning. Hooks remain at a fixed rail depth (z = 0). */
export function garmentPose(distance: number) {
  const a = Math.abs(distance);
  const sign = Math.sign(distance);
  const transition = clamp(a, 0, 1);
  return {
    x:
      sign *
      (Math.min(a, 1) * MOTION.spacing +
        Math.max(0, a - 1) * MOTION.distantSpacing),
    angle: sign * MOTION.sideAngle * smoothstep(transition),
    z: 0,
  };
}
