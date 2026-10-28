import { useEffect, useMemo, useState, type FormEvent } from "react";
import { API_BASE, adminRequest } from "./api";
import type { Product } from "./products";

type Props = {
  products: Product[];
  cart: string[];
  setCart: (next: string[]) => void;
  onCatalogChanged: () => Promise<void>;
  onClose: () => void;
  view: "cart" | "admin";
};
const tokenKey = "moonlight-admin-session";
export function ShopPanels({
  products,
  cart,
  setCart,
  onCatalogChanged,
  onClose,
  view,
}: Props) {
  const [token, setToken] = useState(
    () => sessionStorage.getItem(tokenKey) || "",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"shirts" | "tees">("tees");
  const [color, setColor] = useState("#353e3a");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [ready, setReady] = useState(false);
  const preview = useMemo(
    () => (image ? URL.createObjectURL(image) : ""),
    [image],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(() => {
    if (!token) {
      setReady(true);
      return;
    }
    adminRequest("/api/session", token)
      .then((body) => {
        if (!body.authenticated) {
          sessionStorage.removeItem(tokenKey);
          setToken("");
        }
      })
      .catch(() => {
        sessionStorage.removeItem(tokenKey);
        setToken("");
      })
      .finally(() => setReady(true));
  }, [token]);
  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Login failed");
      sessionStorage.setItem(tokenKey, body.token);
      setToken(body.token);
      setPassword("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!image) {
      setError("Choose a PNG, JPEG or WebP image.");
      return;
    }
    if (image.size > 4_000_000) {
      setError("The image must be under 4 MB.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("category", category);
      form.set("color", color);
      form.set("image", image);
      await adminRequest("/api/products", token, {
        method: "POST",
        body: form,
      });
      await onCatalogChanged();
      setName("");
      setImage(null);
      setSuccess("Added to the rack.");
      const input = document.getElementById(
        "garment-image",
      ) as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await adminRequest(`/api/products/${id}`, token, { method: "DELETE" });
      await onCatalogChanged();
      setSuccess("Garment removed.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="panel-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="side-panel"
        role="dialog"
        aria-modal="true"
        aria-label={view === "cart" ? "Your cart" : "Admin"}
      >
        <div className="panel-head">
          <span className="eyebrow">MOONLIGHT STUDIO</span>
          <button onClick={onClose} aria-label="Close panel">
            ✕
          </button>
        </div>
        {view === "cart" ? (
          <>
            <h2>
              Your cart <span>{cart.length}</span>
            </h2>
            {cart.length ? (
              <>
                <ul className="panel-list">
                  {cart.map((id, i) => {
                    const p = products.find((item) => item.id === id);
                    return (
                      <li key={`${id}-${i}`}>
                        <span
                          className="cart-swatch"
                          style={{ background: p?.color }}
                        />
                        <div>
                          <strong>{p?.name || "Removed piece"}</strong>
                          <small>
                            {p?.category === "shirts" ? "Shirt" : "T-shirt"}
                          </small>
                        </div>
                        <button
                          onClick={() =>
                            setCart(cart.filter((_, n) => n !== i))
                          }
                          aria-label={`Remove ${p?.name || "item"} from cart`}
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="panel-note">
                  Your cart is saved in this browser. Checkout is not available
                  yet.
                </p>
              </>
            ) : (
              <p className="panel-note">
                Your cart is empty. Choose a piece from the rack to add it.
              </p>
            )}
          </>
        ) : (
          <>
            <h2>{token ? "Manage the rack" : "Admin login"}</h2>
            {!ready ? (
              <p>Checking session…</p>
            ) : !token ? (
              <form onSubmit={login} className="panel-form">
                <label>
                  Username
                  <input
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <button className="panel-primary" disabled={busy}>
                  Log in
                </button>
              </form>
            ) : (
              <>
                <button
                  className="panel-logout"
                  onClick={() => {
                    sessionStorage.removeItem(tokenKey);
                    setToken("");
                  }}
                >
                  Log out
                </button>
                <p className="panel-note">
                  Add a Shirt or T-shirt. The image will be fitted to the front
                  of an animated 3D garment; the back uses the chosen fabric
                  color.
                </p>
                <form className="panel-form" onSubmit={upload}>
                  <label>
                    Garment name
                    <input
                      required
                      maxLength={70}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Moonrise Shirt"
                    />
                  </label>
                  <label>
                    Type
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as "shirts" | "tees")
                      }
                    >
                      <option value="shirts">Shirt</option>
                      <option value="tees">T-shirt</option>
                    </select>
                  </label>
                  <label>
                    Fabric color
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                  </label>
                  <label>
                    Garment image
                    <input
                      id="garment-image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      required
                      onChange={(e) => setImage(e.target.files?.[0] || null)}
                    />
                  </label>
                  {image && (
                    <img
                      className="upload-preview"
                      src={preview}
                      alt="Upload preview"
                    />
                  )}
                  <button className="panel-primary" disabled={busy}>
                    {busy ? "Adding…" : "Add to rack"}
                  </button>
                </form>
                <h3>Uploaded pieces</h3>
                <ul className="panel-list">
                  {products
                    .filter((p) => p.imageUrl)
                    .map((p) => (
                      <li key={p.id}>
                        <img src={p.imageUrl} alt="" />
                        <div>
                          <strong>{p.name}</strong>
                          <small>
                            {p.category === "shirts" ? "Shirt" : "T-shirt"}
                          </small>
                        </div>
                        <button disabled={busy} onClick={() => remove(p.id)}>
                          Remove
                        </button>
                      </li>
                    ))}
                </ul>
              </>
            )}
            {error && (
              <p className="panel-error" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="panel-success" role="status">
                {success}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
