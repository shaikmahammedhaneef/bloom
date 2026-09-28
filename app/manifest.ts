import type { MetadataRoute } from "next";

// Web app manifest. Together with the service worker in public/sw.js, this lets
// Chrome, Edge and Android offer "Install app", and iOS "Add to Home Screen".
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bloom — routines, habits and mood",
    short_name: "Bloom",
    description: "Plan your routines, track habits and mood, and look after yourself.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#f6f2ea",
    theme_color: "#2e6b5a",
    categories: ["health", "lifestyle", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", url: "/today", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Mood check-in", url: "/mood", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
