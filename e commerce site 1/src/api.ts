import type { Product } from "./products";
export const API_BASE =
  "https://moonlight-rack-catalog-api.shrewdpixie1.chatgpt.site";
export async function loadCatalog(): Promise<Product[]> {
  const response = await fetch(`${API_BASE}/api/products`);
  if (!response.ok) throw new Error("Could not load new garments");
  const body = await response.json();
  return Array.isArray(body.products) ? body.products : [];
}
export async function adminRequest(
  path: string,
  token: string,
  options: RequestInit = {},
) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}
