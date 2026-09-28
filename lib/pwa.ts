"use client";
// Install-as-app support. Chrome fires `beforeinstallprompt` once, early, so we
// catch it at startup (see components/PwaSetup.tsx) and keep it until the user
// taps "Install app".
import { useSyncExternalStore } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
export type InstallState = "available" | "installed" | "ios" | "unavailable";

let deferred: InstallPromptEvent | null = null;
let started = false;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setupPwa() {
  if (started) return;
  started = true;
  // The inline script in app/layout.tsx catches a prompt fired before hydration.
  const early = (window as { __bloomInstall?: InstallPromptEvent }).__bloomInstall;
  if (early) deferred = early;
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function snapshot(): InstallState {
  if (installed || isStandalone()) return "installed";
  if (deferred) return "available";
  // iOS Safari has no install prompt; the user adds Bloom from the Share menu.
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "ios";
  return "unavailable";
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, snapshot, () => "unavailable");
}

/** Opens the browser's install dialog. Resolves true if the user installed Bloom. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  emit();
  return outcome === "accepted";
}
