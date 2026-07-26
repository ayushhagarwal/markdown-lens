const CACHE_VERSION = "0.9.4-1";
const CACHE_PREFIX = "markdown-lens-";
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${CACHE_VERSION}`;
const EDITOR_PATH = "/editor";
const APP_SHELL = [
  "/manifest.webmanifest",
  "/icon.png",
  "/apple-icon.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(precacheApplicationShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && ![SHELL_CACHE, RUNTIME_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (event.data?.type === "CACHE_URLS" && Array.isArray(event.data.urls)) {
    const urls = event.data.urls
      .map((value) => new URL(value, self.location.origin))
      .filter((url) => url.origin === self.location.origin && isCacheableApplicationAsset(url.pathname))
      .map((url) => url.href);
    event.waitUntil(caches.open(RUNTIME_CACHE).then((cache) => cache.addAll([...new Set(urls)])));
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(url.pathname === EDITOR_PATH ? cacheFirstEditorNavigation(request) : networkFirstNavigation(request));
    return;
  }

  if (isCacheableApplicationAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

async function precacheApplicationShell() {
  const cache = await caches.open(SHELL_CACHE);
  const editorResponse = await fetch(EDITOR_PATH, { cache: "reload" });
  if (!editorResponse.ok) throw new Error("The editor shell could not be cached.");

  await cache.put(EDITOR_PATH, editorResponse.clone());
  const html = await editorResponse.text();
  const buildAssets = extractBuildAssets(html);
  await cache.addAll([...new Set([...APP_SHELL, ...buildAssets])]);
}

function extractBuildAssets(html) {
  const assets = new Set();
  const attributePattern = /(?:src|href)=["']([^"']+)["']/g;
  for (const match of html.matchAll(attributePattern)) {
    const url = new URL(match[1], self.location.origin);
    if (url.origin === self.location.origin && isCacheableApplicationAsset(url.pathname)) {
      assets.add(`${url.pathname}${url.search}`);
    }
  }
  return [...assets];
}

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match(request)) || offlineResponse();
  }
}

async function cacheFirstEditorNavigation(request) {
  const cached = (await caches.match(request)) || (await caches.match(EDITOR_PATH));
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(EDITOR_PATH, response.clone());
    }
    return response;
  } catch {
    return offlineResponse();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

function isCacheableApplicationAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/tessdata/") ||
    APP_SHELL.includes(pathname)
  );
}

function offlineResponse() {
  return new Response("Markdown Lens is offline and its application shell is unavailable.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
