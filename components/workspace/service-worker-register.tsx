"use client";

import { useEffect, useRef } from "react";

export function ServiceWorkerRegister({ onUpdate }: { onUpdate: (applyUpdate: () => void) => void }) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    let registration: ServiceWorkerRegistration | null = null;
    let applyingUpdate = false;
    let disposed = false;

    const applyUpdate = () => {
      if (!registration?.waiting) return;
      applyingUpdate = true;
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    };
    const announceWaitingUpdate = () => {
      if (registration?.waiting && navigator.serviceWorker.controller) onUpdateRef.current(applyUpdate);
    };
    const handleControllerChange = () => {
      if (applyingUpdate) window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    void navigator.serviceWorker
      .register("/sw.js")
      .then(async (next) => {
        if (disposed) return;
        registration = next;
        announceWaitingUpdate();
        registration.addEventListener("updatefound", () => {
          registration?.installing?.addEventListener("statechange", () => {
            if (registration?.installing?.state === "installed") announceWaitingUpdate();
          });
        });
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) {
          await new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
          });
        }
        if (!disposed) {
          await import("mermaid").catch(() => undefined);
          const loadedAssets = performance
            .getEntriesByType("resource")
            .map((entry) => entry.name)
            .filter((url) => {
              const parsed = new URL(url);
              return parsed.origin === window.location.origin && parsed.pathname.startsWith("/_next/static/");
            });
          registration.active?.postMessage({ type: "CACHE_URLS", urls: loadedAssets });
        }
        if (navigator.onLine) void registration.update();
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
