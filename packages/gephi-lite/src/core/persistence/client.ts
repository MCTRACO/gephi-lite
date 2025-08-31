import { config } from "../../config";

type Slice = "dataset" | "filters" | "appearance" | "layout" | "file" | "preferences" | "session" | "user";

function url(p: string, userId?: string) {
  const base = config.persistence_base_url.endsWith("/") ? config.persistence_base_url : config.persistence_base_url + "/";
  const full = base === "/" ? p : new URL(p, base).toString();
  const u = new URL(full, window.location.origin);
  if (userId) u.searchParams.set("userId", userId);
  return u.toString();
}

export async function loadSlice<T = unknown>(slice: Slice, userId?: string): Promise<T | null> {
  const res = await fetch(url(`/api/${slice}`, userId), { credentials: "omit" });
  if (!res.ok) throw new Error(`Failed to load ${slice}`);
  return (await res.json()) as T | null;
}

export async function saveSlice<T = unknown>(slice: Slice, data: T, userId?: string): Promise<void> {
  const res = await fetch(url(`/api/${slice}`, userId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to save ${slice}`);
}

export async function loadFullState<T = unknown>(userId?: string): Promise<T | null> {
  const res = await fetch(url(`/api/state`, userId));
  if (!res.ok) throw new Error(`Failed to load state`);
  return (await res.json()) as T | null;
}

export async function saveFullState<T = unknown>(state: T, userId?: string): Promise<void> {
  const res = await fetch(url(`/api/state`, userId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error(`Failed to save state`);
}
