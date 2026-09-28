"use client";
// System notifications. They go through the service worker when it is ready,
// which is what Chrome on Android and installed apps require, and fall back to
// the page-level Notification API otherwise.

export type NotifyPermission = NotificationPermission | "unsupported";

export function notifyPermission(): NotifyPermission {
  return typeof window === "undefined" || !("Notification" in window) ? "unsupported" : Notification.permission;
}

export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (notifyPermission() === "unsupported") return "unsupported";
  return Notification.requestPermission();
}

/** Shows a system notification. Returns false if it couldn't be shown. */
export async function showNotification(title: string, body: string, url = "/today"): Promise<boolean> {
  if (notifyPermission() !== "granted") return false;
  const options: NotificationOptions = {
    body,
    tag: title + body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url },
  };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, options);
      return true;
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
