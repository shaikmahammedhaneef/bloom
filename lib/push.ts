"use client";
// Subscribes this browser to Web Push so reminders arrive while Bloom is closed.
import { api } from "./client";
import { notifyPermission } from "./notify";

export type PushState = "on" | "off" | "unsupported" | "not-configured";

function supported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && notifyPermission() !== "unsupported";
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Makes sure this browser is subscribed, if notifications are allowed. Safe to call often. */
export async function syncPush(): Promise<PushState> {
  if (!supported()) return "unsupported";
  if (notifyPermission() !== "granted") return "off";
  const { publicKey } = await api<{ publicKey: string }>("/api/push");
  if (!publicKey) return "not-configured";
  const reg = await navigator.serviceWorker.ready;
  const key = keyBytes(publicKey);
  let sub = await reg.pushManager.getSubscription();
  // A subscription made with a different key can't receive our pushes.
  const had = sub?.options.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
  if (sub && had && (had.length !== key.length || had.some((v, i) => v !== key[i]))) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  await api("/api/push", { body: { subscription: sub.toJSON(), tz } });
  return "on";
}

/** Stops push reminders to this browser, e.g. before signing out. */
export async function stopPush() {
  if (!supported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await api("/api/push", { method: "DELETE", body: { endpoint: sub.endpoint } }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
