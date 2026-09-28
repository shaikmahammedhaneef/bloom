"use client";
import { useEffect } from "react";
import { setupPwa } from "@/lib/pwa";

// Registers the service worker and listens for Chrome's install prompt.
export default function PwaSetup() {
  useEffect(() => setupPwa(), []);
  return null;
}
