import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { garmentPose, MOTION, type RackMotion } from "../motion";
import type { Product, StudioSettings } from "../products";
import { buildGarmentGeometry } from "./garmentGeometry";
import { createFabricTextures } from "./garmentTextures";
export type Inspection =
  "browse" | "entering-inspect" | "inspect" | "exiting-inspect";
type Props = {
  products: Product[];
  controller: RackMotion;
  settings: StudioSettings;
  inspection: Inspection;
  rotation: MutableRefObject<number>;
  reduced: boolean;
  onSelection: (n: number) => void;
  onInspectionState: (s: Inspection) => void;
  onContextLost: () => void;
  onGarmentClick: (i: number) => void;
};
const materialValues = {
  gold: { color: "#c8a66c", metalness: 0.82, roughness: 0.26 },
  chrome: { color: "#b8c4d3", metalness: 0.93, roughness: 0.2 },
  black: { color: "#272a35", metalness: 0.62, roughness: 0.4 },
  wood: { color: "#99704a", metalness: 0, roughness: 0.76 },
};
function tube(points: number[][], radius: number) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...(p as [number, number, number]))),
    ),
    48,
    radius,
    8,
    false,
  );
}
function Hanger({ material }: { material: StudioSettings["hanger"] }) {
  const hook = useMemo(
    () =>
      tube(
        [
          [0, -0.29, 0],
          [0.07, -0.18, 0],
          [0.085, -0.04, 0],
          [0.05, 0.045, 0],
          [-0.025, 0.055, 0],
          [-0.07, 0.005, 0],
          [-0.06, -0.04, 0],
        ],
        0.013,
      ),
    [],
  );
  const frame = useMemo(
    () =>
      tube(
        [
          [0, -0.28, 0],
          [-0.32, -0.45, 0],
          [-0.66, -0.67, 0],
          [-0.69, -0.72, 0],
          [-0.62, -0.75, 0],
          [0.62, -0.75, 0],
          [0.69, -0.72, 0],
          [0.66, -0.67, 0],
          [0.32, -0.45, 0],
          [0, -0.28, 0],
        ],
        material === "wood" ? 0.028 : 0.013,
      ),
    [material],
  );
  useEffect(
    () => () => {
      hook.dispose();
    },
    [hook],
  );
  useEffect(() => () => frame.dispose(), [frame]);
  return (
    <>
      <mesh geometry={hook}>
        <meshStandardMaterial {...materialValues[material]} />
      </mesh>
      <mesh geometry={frame}>
        <meshStandardMaterial {...materialValues[material]} />
      </mesh>
    </>
  );
}
function Garment({
  product,
  index,
  props,
  progress,
}: {
  product: Product;
  index: number;
  props: Props;
  progress: MutableRefObject<number>;
}) {
  const root = useRef<THREE.Group>(null);
  const sway = useRef<THREE.Group>(null);
  const swayVelocity = useRef(0);
  const swayAngle = useRef(0);
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  const geometry = useMemo(
    () => buildGarmentGeometry(product.longSleeve),
    [product.longSleeve],
  );
  const front = useMemo(
    () => createFabricTextures(product.color, product.printed, false),
    [product.color, product.printed],
  );
  const back = useMemo(
    () => createFabricTextures(product.color, product.printed, true),
    [product.color, product.printed],
  );
  const cloth = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        ...front,
        roughness: 0.96,
        metalness: 0,
        side: THREE.DoubleSide,
        normalScale: new THREE.Vector2(0.12, 0.12),
      }),
    [front],
  );
  const rear = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        ...back,
        roughness: 0.96,
        metalness: 0,
        side: THREE.DoubleSide,
        normalScale: new THREE.Vector2(0.12, 0.12),
      }),
    [back],
  );
  const seam = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: product.color,
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    [product.color],
  );
  useEffect(() => {
    mats.current = [cloth, rear, seam];
    return () => {
      Object.values(geometry).forEach((g) => g.dispose());
      Object.values(front).forEach((t) => t.dispose());
      Object.values(back).forEach((t) => t.dispose());
      cloth.dispose();
      rear.dispose();
      seam.dispose();
    };
  }, [geometry, front, back, cloth, rear, seam]);
  useFrame((_, dt) => {
    if (!root.current || !sway.current) return;
    const h = Math.min(dt, 0.04);
    const d = index - props.controller.q,
      p = garmentPose(d),
      inspect = progress.current,
      isSelected = index === props.controller.selectedIndex;
    root.current.position.set(
      THREE.MathUtils.lerp(p.x, isSelected ? 0 : p.x * 1.8, inspect),
      2.02,
      isSelected ? inspect * 0.95 : 0,
    );
    root.current.rotation.y = THREE.MathUtils.lerp(
      p.angle,
      isSelected ? props.rotation.current : p.angle,
      inspect,
    );
    const scale = isSelected ? 1 + inspect * 0.12 : 1 - inspect * 0.92;
    root.current.scale.setScalar(scale);
    root.current.visible = isSelected || inspect < 0.995;
    if (props.reduced) {
      swayAngle.current = 0;
      swayVelocity.current = 0;
    } else {
      const force = THREE.MathUtils.clamp(
        -props.controller.acceleration * 0.0015,
        -0.22,
        0.22,
      );
      swayVelocity.current +=
        (force - swayAngle.current * 30 - swayVelocity.current * 8) * h;
      swayAngle.current = THREE.MathUtils.clamp(
        swayAngle.current + swayVelocity.current * h,
        -MOTION.maximumSway,
        MOTION.maximumSway,
      );
    }
    sway.current.rotation.z = swayAngle.current * (1 - inspect);
    mats.current.forEach((m) => {
      m.transparent = !isSelected && inspect > 0.001;
      m.opacity = isSelected ? 1 : 1 - inspect;
    });
  });
  return (
    <group
      ref={root}
      onClick={(e) => {
        e.stopPropagation();
        props.onGarmentClick(index);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <group ref={sway}>
        <Hanger material={props.settings.hanger} />
        <group position={[0, -0.68, 0]}>
          <mesh geometry={geometry.front} material={cloth} castShadow />
          <mesh geometry={geometry.back} material={rear} castShadow />
          <mesh geometry={geometry.seams} material={seam} />
        </group>
      </group>
    </group>
  );
}
function Rail({
  material,
  progress,
}: {
  material: StudioSettings["rail"];
  progress: MutableRefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (group.current) group.current.visible = progress.current < 0.99;
    if (mat.current) mat.current.opacity = 1 - progress.current;
  });
  return (
    <group ref={group}>
      <mesh position={[0, 2.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.027, 0.027, 7.65, 24]} />
        <meshStandardMaterial
          ref={mat}
          {...materialValues[material]}
          transparent
        />
      </mesh>
      {[-3.77, 3.77].map((x) => (
        <group key={x} position={[x, 2.02, 0]}>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.36, 16]} />
            <meshStandardMaterial {...materialValues[material]} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial {...materialValues[material]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
const palettes = {
  neon: { bg: "#101226", floor: "#17172e", a: "#ff2abc", b: "#43b5ff" },
  studio: { bg: "#292c3b", floor: "#323645", a: "#ffe5c5", b: "#d1e2ff" },
  dawn: { bg: "#493a4d", floor: "#40334b", a: "#ff9a9f", b: "#a8bdf5" },
  forest: { bg: "#172e2b", floor: "#193931", a: "#a7c986", b: "#56bead" },
};
function World(props: Props) {
  const progress = useRef(0);
  const selection = useRef(-1);
  const { camera, size, gl, setDpr } = useThree();
  const quality = useRef({ time: 0, frames: 0, adjusted: false });
  const palette = palettes[props.settings.background];
  useEffect(() => {
    camera.position.set(0, 0.55, size.width / size.height < 1.3 ? 8.4 : 6.5);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = size.width / size.height < 1.3 ? 39 : 35;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(0, 0.55, 0);
  }, [camera, size.width, size.height]);
  useEffect(() => {
    const onLost = (e: Event) => {
      e.preventDefault();
      props.onContextLost();
    };
    gl.domElement.addEventListener("webglcontextlost", onLost);
    return () => gl.domElement.removeEventListener("webglcontextlost", onLost);
  }, [gl, props.onContextLost]);
  useFrame((_, dt) => {
    const qualitySample = quality.current;
    if (!qualitySample.adjusted) {
      qualitySample.time += Math.min(dt, 0.25);
      qualitySample.frames++;
      if (qualitySample.time > 2) {
        if (qualitySample.time / qualitySample.frames > 0.045) setDpr(1);
        qualitySample.adjusted = true;
      }
    }
    if (props.inspection === "browse") props.controller.update(dt);
    const n = props.controller.selectedIndex;
    if (n !== selection.current) {
      selection.current = n;
      props.onSelection(n);
    }
    const wanted =
      props.inspection === "entering-inspect" || props.inspection === "inspect"
        ? 1
        : 0;
    progress.current = THREE.MathUtils.damp(
      progress.current,
      wanted,
      props.reduced ? 16 : 7,
      Math.min(dt, 0.05),
    );
    if (props.inspection === "entering-inspect" && progress.current > 0.995) {
      progress.current = 1;
      props.onInspectionState("inspect");
    }
    if (props.inspection === "exiting-inspect" && progress.current < 0.005) {
      progress.current = 0;
      props.onInspectionState("browse");
    }
  });
  return (
    <>
      <color attach="background" args={[palette.bg]} />
      <fog attach="fog" args={[palette.bg, 12, 26]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#fff4de", "#69708f", 1.2]} />
      <directionalLight position={[0, 5, 6]} intensity={1.8} color="#fff9f0" />
      <pointLight
        position={[-4, 1, 2]}
        intensity={12}
        color={palette.a}
        distance={11}
        decay={2}
      />
      <pointLight
        position={[4, 1, 1]}
        intensity={12}
        color={palette.b}
        distance={11}
        decay={2}
      />
      <spotLight
        position={[0, 5, 3]}
        angle={0.6}
        penumbra={1}
        intensity={12}
        color="#f6ebd7"
      />
      <Rail material={props.settings.rail} progress={progress} />
      {props.products.map((p, i) => (
        <Garment
          key={p.id}
          product={p}
          index={i}
          props={props}
          progress={progress}
        />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.02, 0]}>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color={palette.floor} roughness={1} />
      </mesh>
      <gridHelper
        args={[36, 60, "#5a5975", "#34354e"]}
        position={[0, -1.015, 0]}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.005, 0]}
        scale={[1.7, 0.65, 1]}
      >
        <circleGeometry args={[1, 40]} />
        <meshBasicMaterial
          color="#070a12"
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}
export function RackScene(props: Props) {
  const [ready, setReady] = useState(false);
  return (
    <>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.35, 8.65], fov: 39 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
          setReady(true);
        }}
      >
        <World {...props} />
      </Canvas>
      {!ready && (
        <div className="loading-fallback" role="status">
          Setting the scene
          <span>Preparing cotton, light & a little moonlight.</span>
        </div>
      )}
    </>
  );
}
