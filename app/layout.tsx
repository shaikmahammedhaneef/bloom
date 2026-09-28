import type { Metadata, Viewport } from "next";
import PwaSetup from "@/components/PwaSetup";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bloom — routines, habits and mood",
  description: "Plan your routines, track habits and mood, and look after yourself.",
  applicationName: "Bloom",
  appleWebApp: { capable: true, title: "Bloom", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f2ea" },
    { media: "(prefers-color-scheme: dark)", color: "#15171a" },
  ],
};

// Applies the saved theme before paint so there is no flash of the wrong colors.
// Also holds on to Chrome's install prompt if it fires before React loads.
const themeScript = `addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bloomInstall=e});try{var t=JSON.parse(localStorage.getItem('bloom-theme')||'{}');var d=document.documentElement;if(t.accent)d.dataset.accent=t.accent;if(t.dark)d.dataset.theme='dark';}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <PwaSetup />
      </body>
    </html>
  );
}
