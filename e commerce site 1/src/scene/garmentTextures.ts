import * as THREE from "three";

export interface FabricTextures {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}
const canvas = (size: number) => {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return c;
};
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2,
      size = i % 2 ? r * 0.12 : r * (i % 4 === 0 ? 1 : 0.65);
    const px = x + Math.cos(a) * size,
      py = y + Math.sin(a) * size;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
function moon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // Path describes a crescent; there is no opaque background disc hiding cotton.
  ctx.beginPath();
  ctx.arc(x, y, r, -0.42 * Math.PI, 0.42 * Math.PI, true);
  ctx.bezierCurveTo(
    x - r * 0.73,
    y + r * 0.48,
    x - r * 0.73,
    y - r * 0.48,
    x + r * 0.25,
    y - r * 0.97,
  );
  ctx.closePath();
  ctx.fill();
}
function randomGenerator() {
  let seed = 14319;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}
function makeTexture(c: HTMLCanvasElement, color = false) {
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = 4;
  return texture;
}
/** Deterministic cotton weave and original moon/stars artwork, no external assets. */
export function createFabricTextures(
  color: string,
  printed: boolean,
  back = false,
): FabricTextures {
  const size = 1024,
    image = canvas(size),
    ctx = image.getContext("2d")!;
  const rgb = new THREE.Color(color).convertLinearToSRGB();
  const pixels = ctx.createImageData(size, size),
    rand = randomGenerator();
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const thread = ((x % 3 === 0 ? 1 : 0) + (y % 3 === 0 ? 1 : 0)) * 0.005;
      const grain =
        (rand() - 0.5) * 0.014 +
        thread +
        0.0035 * Math.sin(x * 0.039) * Math.sin(y * 0.028);
      pixels.data[i] = Math.max(0, Math.min(255, rgb.r * 255 + grain * 255));
      pixels.data[i + 1] = Math.max(
        0,
        Math.min(255, rgb.g * 255 + grain * 255),
      );
      pixels.data[i + 2] = Math.max(
        0,
        Math.min(255, rgb.b * 255 + grain * 255),
      );
      pixels.data[i + 3] = 255;
    }
  ctx.putImageData(pixels, 0, 0);
  if (printed) {
    ctx.fillStyle = "#d8d1b7";
    if (back) moon(ctx, 512, 94, 24);
    else {
      moon(ctx, 490, 363, 115);
      const stars = [
        [505, 192, 21],
        [620, 278, 27],
        [638, 395, 19],
        [383, 365, 20],
        [505, 479, 11],
        [501, 563, 20],
        [565, 335, 10],
        [589, 213, 7],
        [419, 248, 8],
        [649, 481, 8],
      ];
      for (const [x, y, r] of stars) star(ctx, x, y, r);
      for (let i = 0; i < 48; i++) {
        const a = rand() * Math.PI * 2,
          radius = 120 + rand() * 78;
        ctx.globalAlpha = 0.35 + rand() * 0.65;
        ctx.beginPath();
        ctx.arc(
          512 + Math.cos(a) * radius,
          357 + Math.sin(a) * radius,
          0.8 + rand() * 1.7,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.font = "17px Georgia, serif";
      ctx.textAlign = "center";
      const word = "MOONLIGHT",
        spacing = 20;
      [...word].forEach((letter, i) =>
        ctx.fillText(letter, 512 + (i - 4) * spacing, 525),
      );
      // Side UV strips give long sleeves a restrained vertical constellation.
      for (const x of [35, 988])
        for (const y of [260, 430, 660]) star(ctx, x, y, 8);
    }
    // Tiny lost ink specks keep the print from feeling like glossy vinyl.
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = color;
    for (let i = 0; i < 550; i++)
      ctx.fillRect(
        310 + rand() * 400,
        180 + rand() * 400,
        rand() * 2,
        rand() * 2,
      );
    ctx.globalAlpha = 1;
  }
  const normal = canvas(256),
    nctx = normal.getContext("2d")!,
    ni = nctx.createImageData(256, 256);
  const rough = canvas(256),
    rctx = rough.getContext("2d")!,
    ri = rctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4,
        noise = rand();
      ni.data[i] = 128 + Math.sin((x * Math.PI) / 2) * 7 + (noise - 0.5) * 5;
      ni.data[i + 1] =
        128 + Math.sin((y * Math.PI) / 2) * 7 + (noise - 0.5) * 5;
      ni.data[i + 2] = 252;
      ni.data[i + 3] = 255;
      ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = 219 + noise * 25;
      ri.data[i + 3] = 255;
    }
  nctx.putImageData(ni, 0, 0);
  rctx.putImageData(ri, 0, 0);
  return {
    map: makeTexture(image, true),
    normalMap: makeTexture(normal),
    roughnessMap: makeTexture(rough),
  };
}

/** Fit an uploaded front photo to the curved textile shell, suppressing a plain photo background. */
export async function loadCustomFabricMap(
  base: THREE.CanvasTexture,
  url: string,
): Promise<THREE.CanvasTexture> {
  const photo = new Image();
  photo.crossOrigin = "anonymous";
  photo.src = url;
  await photo.decode();
  const source = document.createElement("canvas");
  source.width = 640;
  source.height = 760;
  const sc = source.getContext("2d")!;
  const ratio = Math.min(640 / photo.width, 760 / photo.height);
  const w = photo.width * ratio,
    h = photo.height * ratio;
  sc.drawImage(photo, (640 - w) / 2, (760 - h) / 2, w, h);
  const frame = sc.getImageData(0, 0, 640, 760),
    px = frame.data;
  const corners = [
    [3, 3],
    [636, 3],
    [3, 756],
    [636, 756],
  ].map(([x, y]) => {
    const i = (y * 640 + x) * 4;
    return [px[i], px[i + 1], px[i + 2]];
  });
  const bg = [0, 1, 2].map((c) => corners.reduce((n, p) => n + p[c], 0) / 4);
  const uniform = corners.every(
    (p) => Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]) < 35,
  );
  if (uniform)
    for (let i = 0; i < px.length; i += 4) {
      const diff = Math.hypot(
        px[i] - bg[0],
        px[i + 1] - bg[1],
        px[i + 2] - bg[2],
      );
      px[i + 3] = Math.round(
        px[i + 3] * THREE.MathUtils.smoothstep(diff, 22, 65),
      );
    }
  sc.putImageData(frame, 0, 0);
  const output = document.createElement("canvas");
  output.width = 1024;
  output.height = 1024;
  const ctx = output.getContext("2d")!;
  ctx.drawImage(base.image as HTMLCanvasElement, 0, 0);
  ctx.drawImage(source, 140, 65, 744, 920);
  const texture = new THREE.CanvasTexture(output);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
