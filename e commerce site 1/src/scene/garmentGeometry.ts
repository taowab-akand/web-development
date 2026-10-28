import * as THREE from "three";

/** Original, reproducible cotton garment geometry. Dimensions are scene units. */
export interface GarmentGeometry {
  front: THREE.BufferGeometry;
  back: THREE.BufferGeometry;
  seams: THREE.BufferGeometry;
}

type V3 = [number, number, number];
class Surface {
  positions: number[] = [];
  uvs: number[] = [];
  indices: number[] = [];
  add(point: V3, uv: [number, number]) {
    this.positions.push(...point);
    this.uvs.push(...uv);
    return this.positions.length / 3 - 1;
  }
  patch(
    rows: number,
    cols: number,
    point: (v: number, u: number) => V3,
    uv: (v: number, u: number) => [number, number],
    reverse = false,
  ) {
    const offset = this.positions.length / 3;
    for (let r = 0; r <= rows; r++)
      for (let c = 0; c <= cols; c++)
        this.add(point(r / rows, c / cols), uv(r / rows, c / cols));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const a = offset + r * (cols + 1) + c,
          b = a + 1,
          d = a + cols + 1,
          e = d + 1;
        this.indices.push(
          ...(reverse ? [a, d, b, b, d, e] : [a, b, d, b, e, d]),
        );
      }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(this.positions, 3),
    );
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));
    g.setIndex(this.indices);
    g.computeVertexNormals();
    return g;
  }
}
const neck = 0.265;
const shoulderWidth = 0.75;
const armholeT = 0.285;
function bodyWidth(t: number) {
  return shoulderWidth + 0.025 * t - 0.016 * Math.sin(Math.PI * t);
}
function shoulder(x: number, isBack: boolean) {
  const ax = Math.abs(x);
  return ax < neck
    ? 0.055 -
        (isBack ? 0.105 : 0.285) * Math.sqrt(Math.max(0, 1 - (ax / neck) ** 2))
    : 0.055 - (0.14 * (ax - neck)) / (shoulderWidth - neck);
}
function bodyPoint(t: number, u: number, back: boolean): V3 {
  const signedU = u * 2 - 1,
    x = signedU * bodyWidth(t);
  const topX = signedU * shoulderWidth;
  const top = shoulder(topX, back);
  const y = THREE.MathUtils.lerp(
    top,
    -2.04 + 0.012 * Math.cos(signedU * 10),
    t,
  );
  const topDepth =
    Math.abs(topX) < neck
      ? 0.035 + 0.182 * Math.sqrt(Math.max(0, 1 - (topX / neck) ** 2))
      : 0.035;
  // At the armhole, the torso edge opens into the same oval used by the sleeve.
  // Sharing this boundary removes the detached cylindrical-sleeve look.
  const edge =
    t < armholeT ? 0.035 + 0.118 * Math.sin((Math.PI * t) / armholeT) : 0.027;
  const belly =
    edge + (0.175 - edge) * Math.sqrt(Math.max(0, 1 - signedU ** 2));
  const blend = THREE.MathUtils.smoothstep(t, 0, 0.26);
  const fold =
    (0.006 * Math.sin(signedU * 13 + t * 5) +
      0.0025 * Math.sin(signedU * 29 - t * 4)) *
      Math.sin(Math.PI * t) +
    0.004 * Math.cos(signedU * 17) * t ** 7;
  const depth = THREE.MathUtils.lerp(topDepth, belly, blend) + fold;
  return [
    x + 0.003 * Math.sin(t * 9 + signedU * 5) * Math.sin(Math.PI * t),
    y,
    (back ? -1 : 1) * depth,
  ];
}
function sleevePoint(
  t: number,
  phase: number,
  side: number,
  long: boolean,
  isBack?: boolean,
): V3 {
  // The first ring shares the torso's full armhole boundary vertex for vertex.
  // It gradually rounds and bends down into the sleeve, rather than intersecting
  // an independent cylinder with the shoulder.
  const back = isBack ?? Math.sin(phase) < 0;
  const rootT = (armholeT * (1 - Math.cos(phase))) / 2;
  const root = bodyPoint(rootT, side < 0 ? 0 : 1, back);
  const rootTop = bodyPoint(0, side < 0 ? 0 : 1, back);
  const rootBottom = bodyPoint(armholeT, side < 0 ? 0 : 1, back);
  const rootY = (rootTop[1] + rootBottom[1]) / 2;
  const bend = THREE.MathUtils.smoothstep(t, 0, 0.72);
  const travel = long
    ? (0.33 * (1 - Math.exp(-4 * t))) / (1 - Math.exp(-4))
    : 0.36 * t;
  const dx = long ? (0.33 * 4 * Math.exp(-4 * t)) / (1 - Math.exp(-4)) : 0.36;
  const dy = -(long ? 1.46 : 0.25),
    length = Math.hypot(dx, dy);
  const nx = -dy / length,
    ny = dx / length;
  const radius = long
    ? THREE.MathUtils.lerp(0.272, 0.112, t)
    : THREE.MathUtils.lerp(0.272, 0.218, t);
  const depth = long
    ? THREE.MathUtils.lerp(0.153, 0.095, t)
    : THREE.MathUtils.lerp(0.153, 0.129, t);
  const wrinkle =
    1 +
    0.009 * Math.sin(t * (long ? 30 : 14) + phase * 2) +
    (long ? 0.012 * Math.sin(t * 44) * t ** 2 : 0);
  const rootXOffset = Math.abs(root[0]) - shoulderWidth;
  const x =
    side *
    (shoulderWidth +
      travel +
      THREE.MathUtils.lerp(
        rootXOffset,
        nx * Math.cos(phase) * radius * wrinkle,
        bend,
      ));
  const y =
    rootY +
    dy * t +
    THREE.MathUtils.lerp(
      root[1] - rootY,
      ny * Math.cos(phase) * radius * wrinkle,
      bend,
    );
  const z = THREE.MathUtils.lerp(
    root[2],
    Math.sin(phase) * depth * wrinkle,
    bend,
  );
  return [x, y, z];
}
function addTube(
  target: Surface,
  points: V3[],
  radius: number,
  sides = 8,
  closed = false,
) {
  const path = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    closed,
  );
  const geometry = new THREE.TubeGeometry(
    path,
    Math.max(24, points.length * 5),
    radius,
    sides,
    closed,
  );
  const position = geometry.getAttribute("position"),
    uv = geometry.getAttribute("uv");
  const offset = target.positions.length / 3;
  for (let i = 0; i < position.count; i++)
    target.add(
      [position.getX(i), position.getY(i), position.getZ(i)],
      [0.015 + uv.getX(i) * 0.012, uv.getY(i)],
    );
  const indices = geometry.getIndex()!;
  for (let i = 0; i < indices.count; i++)
    target.indices.push(offset + indices.getX(i));
  geometry.dispose();
}

/** Front and back are separate textile surfaces with independent artwork/UVs. */
export function buildGarmentGeometry(longSleeve: boolean): GarmentGeometry {
  const front = new Surface(),
    back = new Surface(),
    seams = new Surface();
  for (const [target, isBack] of [
    [front, false],
    [back, true],
  ] as const) {
    target.patch(
      56,
      56,
      (t, u) => bodyPoint(t, u, isBack),
      (t, u) => [u, 1 - t],
      !isBack,
    );
    for (const side of [-1, 1]) {
      target.patch(
        longSleeve ? 46 : 24,
        24,
        (t, u) =>
          sleevePoint(
            t,
            (isBack ? -1 : 1) * Math.PI * u,
            side,
            longSleeve,
            isBack,
          ),
        (t, u) => [side < 0 ? 0.018 + u * 0.04 : 0.942 + u * 0.04, 1 - t],
        side < 0 ? !isBack : isBack,
      );
    }
  }
  // Shoulder top walls connect the front and back while leaving the neck open.
  for (const side of [-1, 1])
    front.patch(
      5,
      20,
      (v, u) => {
        const x = side * THREE.MathUtils.lerp(neck, shoulderWidth, u);
        return [x, shoulder(x, false), THREE.MathUtils.lerp(-0.035, 0.035, v)];
      },
      (v, u) => [0.01 + u * 0.025, 0.96 - v * 0.02],
      side < 0,
    );
  // Side walls start below the armhole. The sleeves cover its open upper section.
  for (const side of [-1, 1])
    front.patch(
      42,
      5,
      (t, u) => {
        const along = armholeT + t * (1 - armholeT);
        const f = bodyPoint(along, side < 0 ? 0 : 1, false),
          b = bodyPoint(along, side < 0 ? 0 : 1, true);
        return [
          f[0],
          THREE.MathUtils.lerp(b[1], f[1], u),
          THREE.MathUtils.lerp(b[2], f[2], u),
        ];
      },
      (t, u) => [0.012 + u * 0.01, 0.75 * (1 - t)],
      side < 0,
    );
  // Close the small front/back shoulder seam until each sleeve becomes round.
  for (const side of [-1, 1])
    for (const phase of [0, Math.PI])
      front.patch(
        16,
        3,
        (t, u) => {
          const along = t * 0.72;
          const f = sleevePoint(along, phase, side, longSleeve, false);
          const b = sleevePoint(along, -phase, side, longSleeve, true);
          return [
            THREE.MathUtils.lerp(b[0], f[0], u),
            THREE.MathUtils.lerp(b[1], f[1], u),
            THREE.MathUtils.lerp(b[2], f[2], u),
          ];
        },
        (t, u) => [0.012 + u * 0.01, 0.93 - t * 0.1],
        phase === 0,
      );
  // Ribbed collar follows the actual front/back neckline, including lowered front.
  const collar: V3[] = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2,
      x = neck * Math.cos(a),
      frontSide = Math.sin(a) >= 0;
    collar.push([
      x,
      shoulder(x, !frontSide) + 0.008,
      Math.sign(Math.sin(a)) * (0.035 + 0.182 * Math.abs(Math.sin(a))),
    ]);
  }
  addTube(seams, collar, 0.019, 8, true);
  // A second inset stitch line makes the neckline read as cotton ribbing.
  addTube(
    seams,
    collar.map(([x, y, z]) => [x * 1.055, y - 0.022, z * 1.055]),
    0.0035,
    5,
    true,
  );
  for (const side of [-1, 1]) {
    const cuff: V3[] = [];
    for (let i = 0; i < 48; i++)
      cuff.push(sleevePoint(0.994, (i / 48) * Math.PI * 2, side, longSleeve));
    addTube(seams, cuff, longSleeve ? 0.018 : 0.008, 7, true);
    const hem: V3[] = [];
    for (let i = 0; i <= 48; i++) hem.push(bodyPoint(0.982, i / 48, side < 0));
    addTube(seams, hem, 0.0055, 5);
  }
  return {
    front: front.geometry(),
    back: back.geometry(),
    seams: seams.geometry(),
  };
}
