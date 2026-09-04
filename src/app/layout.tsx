import type { Metadata } from "next";
import "./globals.css";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Ajaia Docs",
  description: "A lightweight collaborative document editor",
};

// Every page is user-specific (mock user in a cookie) and the shell reads the
// database, so there is nothing to statically prerender. This also keeps the
// build from needing a reachable database.
export const dynamic = "force-dynamic";

// This app ships no service worker. If another project previously registered
// one on the same origin (common on localhost:3000), it can serve stale pages
// and force manual hard-refreshes. Tear any such worker (and its caches) down,
// and reload once if one was actively controlling the page.
const SW_CLEANUP = `
if ('serviceWorker' in navigator) {
  var hadController = !!navigator.serviceWorker.controller;
  var jobs = [
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      return Promise.all(regs.map(function (r) { return r.unregister(); }));
    }).catch(function () {})
  ];
  if (window.caches && caches.keys) {
    jobs.push(caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }).catch(function () {}));
  }
  if (hadController && !sessionStorage.getItem('sw-cleared')) {
    Promise.all(jobs).then(function () {
      sessionStorage.setItem('sw-cleared', '1');
      location.reload();
    });
  }
}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: SW_CLEANUP }} />
      </head>
      <body className="antialiased min-h-screen">
        <TopBar />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
