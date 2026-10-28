import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { RackMotion, MOTION } from "./motion";
import {
  defaults,
  products,
  type Product,
  type StudioSettings,
} from "./products";
import { RackScene, type Inspection } from "./scene/RackScene";

const Arrow = ({ right = false }: { right?: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    style={right ? { transform: "rotate(180deg)" } : undefined}
  >
    <path d="M15 5l-7 7 7 7M8 12h13" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
const Diagonal = () => (
  <svg
    className="diagonal-arrow"
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path d="M3 13 13 3M3 3h10v10" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);
const Moon = () => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path
      d="M23.5 23.7A12.7 12.7 0 0 1 10 3.8a12.8 12.8 0 1 0 13.5 19.9Z"
      fill="currentColor"
    />
    <path d="m23 3 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="currentColor" />
  </svg>
);
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function availableWebGL() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (gl) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
function StaticGarment({ product }: { product: Product }) {
  return (
    <svg
      className="static-garment"
      viewBox="0 0 300 310"
      role="img"
      aria-label={`${product.colorName} ${product.name}`}
    >
      <path
        d="M102 25 58 43 12 101 53 134 75 108 69 287Q150 303 231 287L225 108 247 134 288 101 242 43 198 25Q150 48 102 25Z"
        fill={product.color}
        stroke="#ffffff55"
        strokeWidth="2"
      />
      <path
        d="M104 26Q150 82 196 26"
        fill="none"
        stroke="#ffffff50"
        strokeWidth="5"
      />
      {product.printed && (
        <>
          <path
            d="M166 110a37 37 0 1 0 23 61 36 36 0 0 1-23-61"
            fill="#d8cdaa"
          />
          <text
            x="150"
            y="213"
            textAnchor="middle"
            fontSize="10"
            fill="#d8cdaa"
            letterSpacing="4"
          >
            MOONLIGHT
          </text>
        </>
      )}
    </svg>
  );
}
function Choices<T extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: T;
  items: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="control-card">
      <legend>{label}</legend>
      <div className="choices">
        {items.map(([id, name]) => (
          <button
            key={id}
            type="button"
            className={value === id ? "choice active" : "choice"}
            aria-pressed={value === id}
            onClick={() => onChange(id)}
          >
            {label === "Atmosphere" && <i className={`preset-dot ${id}`} />}
            {name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
export default function App() {
  const [settings, setSettings] = useState<StudioSettings>({ ...defaults });
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          settings.collection === "all" || p.category === settings.collection,
      ),
    [settings.collection],
  );
  const controller = useRef(new RackMotion(products.length));
  const [selected, setSelected] = useState(0);
  const selectedId = useRef(products[0].id);
  const [inspection, setInspection] = useState<Inspection>("browse");
  const inspectionRef = useRef<Inspection>("browse");
  const rotation = useRef(0);
  const [help, setHelp] = useState(false);
  const [webgl, setWebgl] = useState(() => availableWebGL());
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const surface = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const helpRef = useRef<HTMLDialogElement>(null);
  const lastActivity = useRef(performance.now());
  const lastPointer = useRef({
    id: -1,
    x: 0,
    y: 0,
    lastX: 0,
    lastTime: 0,
    v: 0,
    intent: false,
    moved: false,
  });
  const product = filtered[selected] ?? filtered[0];
  const paused = useRef(false);
  const changeInspection = (s: Inspection) => {
    inspectionRef.current = s;
    setInspection(s);
  };
  const interact = () => {
    lastActivity.current = performance.now();
  };
  const inspect = () => {
    if (!filtered.length || inspectionRef.current !== "browse") return;
    interact();
    controller.current.select(Math.round(controller.current.q));
    controller.current.stop();
    rotation.current = 0;
    changeInspection("entering-inspect");
  };
  const close = () => {
    if (
      inspectionRef.current === "inspect" ||
      inspectionRef.current === "entering-inspect"
    ) {
      changeInspection("exiting-inspect");
      interact();
      surface.current?.focus();
    }
  };
  const step = (n: number) => {
    if (inspectionRef.current !== "browse") return;
    interact();
    controller.current.step(n);
    if (!webgl) setSelected(Math.round(controller.current.target));
  };
  const update = <K extends keyof StudioSettings>(
    key: K,
    value: StudioSettings[K],
  ) => {
    interact();
    setSettings((s) => ({ ...s, [key]: value }));
  };
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  useEffect(() => {
    controller.current.reducedMotion = reduced;
  }, [reduced]);
  useEffect(() => {
    const index = Math.max(
      0,
      filtered.findIndex((p) => p.id === selectedId.current),
    );
    selectedId.current = filtered[index]?.id ?? "";
    controller.current.setCount(filtered.length, index);
    setSelected(index);
    changeInspection("browse");
  }, [filtered]);
  useEffect(() => {
    if (inspection === "inspect" || inspection === "entering-inspect")
      closeRef.current?.focus();
  }, [inspection]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && inspectionRef.current !== "browse") close();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, []);
  useEffect(() => {
    if (help) {
      helpRef.current?.showModal();
    } else helpRef.current?.close();
  }, [help]);
  useEffect(() => {
    const fn = () => {
      paused.current = document.hidden;
      lastActivity.current = performance.now();
    };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      if (
        settings.auto &&
        !reduced &&
        !paused.current &&
        inspectionRef.current === "browse" &&
        filtered.length > 1 &&
        performance.now() - lastActivity.current > 4300
      ) {
        const next =
          (Math.round(controller.current.target) + 1) % filtered.length;
        controller.current.select(next);
        lastActivity.current = performance.now();
      }
    }, 250);
    return () => clearInterval(id);
  }, [settings.auto, reduced, filtered.length]);
  useEffect(() => {
    const el = surface.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (
        e.ctrlKey ||
        inspectionRef.current !== "browse" ||
        filtered.length < 2
      )
        return;
      const delta =
        (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) *
        (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1);
      const c = controller.current;
      if (
        (c.target <= 0 && delta < 0) ||
        (c.target >= filtered.length - 1 && delta > 0)
      )
        return;
      e.preventDefault();
      interact();
      c.input(delta * MOTION.wheelSensitivity);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [filtered.length]);
  const keydown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (inspectionRef.current !== "browse") {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        rotation.current += (e.key === "ArrowRight" ? 1 : -1) * 0.35;
      }
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    }
    if ((e.key === "Enter" || e.key === " ") && e.target === surface.current) {
      e.preventDefault();
      inspect();
    }
  };
  const fallback = (
    <div className="fallback">
      <span className="eyebrow">STATIC COLLECTION VIEW</span>
      {product && <StaticGarment product={product} />}
      <p>
        3D isn’t available on this device.
        <br />
        Use the arrows to explore the collection.
      </p>
    </div>
  );
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href="#studio" aria-label="Moonlight home">
          <Moon />
          <span>
            moonlight<span className="wordmark-star">®</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a className="nav-active" href="#studio">
            The rack <span>03</span>
          </a>
          <a href="#collection-notes">The collection</a>
        </nav>
        <button className="text-button" onClick={() => setHelp(true)}>
          How to explore{" "}
          <span>
            <Diagonal />
          </span>
        </button>
      </header>
      <main id="studio">
        <div className="page-title">
          <div>
            <div className="eyebrow">
              <span className="tiny-line" /> OBJECTS FOR THE AFTER HOURS
            </div>
            <h1>
              A little space to <em>hang out.</em>
            </h1>
          </div>
          <p>
            Three everyday pieces. A different perspective.
            <br />
            Meet the Moonlight collection in motion.
          </p>
        </div>
        <section
          className={`studio ${settings.background}`}
          aria-label="Interactive clothing studio"
        >
          <div className="studio-topline">
            <div>
              <span className="live-dot" /> THE RACK STUDIO{" "}
              <span className="studio-version">/ VOL. 001</span>
            </div>
            <span className="studio-top-right">A CLOSER LOOK AT EVERYDAY</span>
          </div>
          <div
            ref={surface}
            className={`scene-surface ${inspection !== "browse" ? "inspecting" : ""}`}
            tabIndex={0}
            role="region"
            aria-label="3D rack. Drag horizontally or scroll to browse. Arrow keys select, Enter inspects, Escape closes."
            data-product={product?.id}
            onKeyDown={keydown}
            onPointerDown={(e) => {
              if (
                (e.target as HTMLElement).closest("button") ||
                e.button !== 0 ||
                !e.isPrimary
              )
                return;
              interact();
              lastPointer.current = {
                id: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                lastX: e.clientX,
                lastTime: performance.now(),
                v: 0,
                intent: false,
                moved: false,
              };
            }}
            onPointerMove={(e) => {
              const p = lastPointer.current;
              if (p.id !== e.pointerId) return;
              const dx = e.clientX - p.x,
                dy = e.clientY - p.y;
              if (
                !p.intent &&
                Math.abs(dx) > 6 &&
                Math.abs(dx) > Math.abs(dy) * 1.2
              ) {
                p.intent = true;
                if (inspectionRef.current === "browse") controller.current.dragging = true;
                p.moved = true;
                e.currentTarget.setPointerCapture(e.pointerId);
              }
              if (!p.intent) return;
              interact();
              const now = performance.now(),
                delta = e.clientX - p.lastX;
              const dt = Math.max(8, now - p.lastTime) / 1000;
              p.v =
                p.v * 0.35 +
                ((-delta *
                  MOTION.dragSensitivity *
                  (420 / Math.max(180, e.currentTarget.clientWidth * 0.42))) /
                  dt) *
                  0.65;
              if (inspectionRef.current === "browse")
                controller.current.input(
                  -delta *
                    MOTION.dragSensitivity *
                    (420 / Math.max(180, e.currentTarget.clientWidth * 0.42)),
                );
              else rotation.current += delta * 0.012;
              p.lastX = e.clientX;
              p.lastTime = now;
            }}
            onPointerUp={(e) => {
              const p = lastPointer.current;
              if (p.id !== e.pointerId) return;
              if (p.intent && inspectionRef.current === "browse")
                controller.current.release(
                  performance.now() - p.lastTime < 100 ? p.v : 0,
                );
              lastPointer.current.id = -1;
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={() => {
              lastPointer.current.id = -1;
              controller.current.release(0);
            }}
            onLostPointerCapture={() => {
              if (lastPointer.current.id !== -1) {
                lastPointer.current.id = -1;
                controller.current.release(0);
              }
            }}
          >
            <div className="scene-glow left" />
            <div className="scene-glow right" />
            {filtered.length === 0 ? (
              <div className="empty-state">
                <Moon />
                <h2>A quiet rail, for now.</h2>
                <p>The archive is resting. Discover the current collection.</p>
                <button
                  className="cream-button"
                  onClick={() => update("collection", "all")}
                >
                  Back to all pieces
                </button>
              </div>
            ) : webgl ? (
              <SceneBoundary fallback={fallback}>
                <RackScene
                  products={filtered}
                  controller={controller.current}
                  settings={settings}
                  inspection={inspection}
                  rotation={rotation}
                  reduced={reduced}
                  onSelection={(i) => {
                    selectedId.current = filtered[i]?.id ?? "";
                    setSelected(i);
                  }}
                  onInspectionState={changeInspection}
                  onContextLost={() => setWebgl(false)}
                  onGarmentClick={(i) => {
                    if (
                      lastPointer.current.moved ||
                      inspectionRef.current !== "browse"
                    )
                      return;
                    interact();
                    if (Math.abs(controller.current.q - i) > 0.12) {
                      controller.current.select(i);
                    } else if (settings.click === "inspect") inspect();
                  }}
                />
              </SceneBoundary>
            ) : (
              fallback
            )}
            {inspection !== "browse" && (
              <button
                ref={closeRef}
                className="close-inspect"
                onClick={close}
                aria-label="Close garment inspection"
              >
                ✕ <span>Back to rack</span>
              </button>
            )}
            <div className="scene-instruction">
              <span className="mouse-icon">↔</span>
              <span>
                {inspection === "browse"
                  ? "Scroll or drag to find your piece."
                  : "Drag to turn. Every side has a story."}
              </span>
            </div>
            <div className="scene-coordinate" aria-hidden="true">
              {inspection === "browse" ? "BROWSE MODE" : "INSPECTION MODE"}
              <span>◌ &nbsp; 3D LIVE VIEW</span>
            </div>
          </div>
          <div className="product-bar">
            <div
              className="product-identity"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="product-number">
                {product?.number ?? "—"}
                <span> / 03</span>
              </span>
              <span
                className="product-swatch"
                style={{ background: product?.color }}
              />
              <div>
                <h2>{product?.name ?? "The archive"}</h2>
                <p>
                  {product
                    ? `${product.colorName} · ${product.fabric}`
                    : "No pieces in this collection"}
                </p>
              </div>
            </div>
            <div className="product-actions">
              <button
                className="inspect-button"
                onClick={inspect}
                disabled={!product || inspection !== "browse"}
              >
                Inspect piece{" "}
                <span>
                  <Diagonal />
                </span>
              </button>
              <div className="arrow-controls">
                <button
                  aria-label="Previous garment"
                  onClick={() => step(-1)}
                  disabled={selected === 0 || inspection !== "browse"}
                >
                  <Arrow />
                </button>
                <button
                  aria-label="Next garment"
                  onClick={() => step(1)}
                  disabled={
                    selected >= filtered.length - 1 ||
                    !filtered.length ||
                    inspection !== "browse"
                  }
                >
                  <Arrow right />
                </button>
              </div>
            </div>
          </div>
          <div className="settings-heading">
            <span>MAKE THE SPACE YOURS</span>
            <span>
              STUDIO SETTINGS{" "}
              <span>
                <Diagonal />
              </span>
            </span>
          </div>
          <div className="studio-controls">
            <Choices
              label="Atmosphere"
              value={settings.background}
              items={[
                ["neon", "Neon"],
                ["studio", "Studio"],
                ["dawn", "Dawn"],
                ["forest", "Forest"],
              ]}
              onChange={(v) => update("background", v)}
            />
            <Choices
              label="Collection"
              value={settings.collection}
              items={[
                ["all", "All pieces"],
                ["tees", "T-shirts"],
                ["long-sleeves", "Long sleeve"],
                ["archive", "Archive"],
              ]}
              onChange={(v) => update("collection", v)}
            />
            <Choices
              label="The rail"
              value={settings.rail}
              items={[
                ["gold", "Gold"],
                ["chrome", "Chrome"],
                ["black", "Black"],
                ["wood", "Wood"],
              ]}
              onChange={(v) => update("rail", v)}
            />
            <Choices
              label="Hangers"
              value={settings.hanger}
              items={[
                ["chrome", "Chrome"],
                ["gold", "Gold"],
                ["wood", "Wood"],
              ]}
              onChange={(v) => update("hanger", v)}
            />
            <Choices
              label="On click"
              value={settings.click}
              items={[
                ["inspect", "Inspect"],
                ["select", "Select only"],
              ]}
              onChange={(v) => update("click", v)}
            />
            <fieldset className="control-card playback">
              <legend>Take your time</legend>
              <button
                className={`auto-button ${settings.auto ? "enabled" : ""}`}
                aria-pressed={settings.auto}
                disabled={reduced}
                onClick={() => update("auto", !settings.auto)}
              >
                <span className="toggle">
                  <i />
                </span>
                Auto browse
              </button>
              <button
                className="reset-button"
                onClick={() => {
                  setSettings({ ...defaults });
                  controller.current.select(0);
                  rotation.current = 0;
                  close();
                  interact();
                }}
              >
                ↺ &nbsp;Reset studio
              </button>
            </fieldset>
          </div>
        </section>
        <footer id="collection-notes">
          <div>
            <span className="footer-star">
              <Moon />
            </span>
            <p>
              Made for slower days.
              <br />
              <span>Designed to be seen from every angle.</span>
            </p>
          </div>
          <span className="footer-note">
            MOONLIGHT COLLECTION &nbsp; / &nbsp; 2026
          </span>
          <button className="text-button" onClick={() => setHelp(true)}>
            A few small pointers{" "}
            <span>
              <Diagonal />
            </span>
          </button>
        </footer>
      </main>
      <dialog
        ref={helpRef}
        className="help-dialog"
        onCancel={() => setHelp(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setHelp(false);
        }}
      >
        <button
          className="dialog-close"
          onClick={() => setHelp(false)}
          aria-label="Close help"
        >
          ✕
        </button>
        <span className="eyebrow">A FEW SMALL POINTERS</span>
        <h2>Find your rhythm.</h2>
        <p>
          Scroll over the studio or drag sideways to slide between pieces. The
          rail follows your movement.
        </p>
        <dl>
          <div>
            <dt>← →</dt>
            <dd>Move one garment</dd>
          </div>
          <div>
            <dt>Click / Enter</dt>
            <dd>Inspect your selected piece</dd>
          </div>
          <div>
            <dt>Drag in inspection</dt>
            <dd>Turn the garment, front to back</dd>
          </div>
          <div>
            <dt>Esc</dt>
            <dd>Return to the rack</dd>
          </div>
        </dl>
        <p className="help-note">
          On your phone, swipe sideways to browse. Scroll vertically anywhere to
          move down the page. Reduced motion follows your device settings.
        </p>
      </dialog>
    </div>
  );
}
