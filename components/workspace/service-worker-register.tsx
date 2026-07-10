"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister({ onUpdate }: { onUpdate: () => void }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let registration: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker.register("/sw.js").then((next) => {
      registration = next;
      if (registration.waiting) onUpdate();
      registration.addEventListener("updatefound", () => {
        registration?.installing?.addEventListener("statechange", () => {
          if (registration?.waiting && navigator.serviceWorker.controller) onUpdate();
        });
      });
    });
    return undefined;
  }, [onUpdate]);
  return null;
}
