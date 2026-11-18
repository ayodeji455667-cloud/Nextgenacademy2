"use client";
import { useEffect } from "react";

/** Registers the service worker that makes the app installable and gives an offline page. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not fatal: the app still works without offline support.
    });
  }, []);
  return null;
}
