const RELOAD_KEY = "__lazy_chunk_reload_once__";
const CHUNK_ERROR_PATTERNS = [
  "ChunkLoadError",
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "error loading dynamically imported module",
  "Failed to import",
];

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function getErrorText(error: unknown) {
  if (error instanceof Error) return `${error.name} ${error.message}`;
  return String(error ?? "");
}

function isChunkLoadError(error: unknown) {
  const text = getErrorText(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => text.includes(pattern));
}

export async function lazyWithRetry<T>(factory: () => Promise<T>, retries = 1): Promise<T> {
  try {
    const module = await factory();
    try {
      window.sessionStorage.removeItem(RELOAD_KEY);
    } catch {
      // noop
    }
    return module;
  } catch (error) {
    if (retries > 0) {
      await wait(400);
      return lazyWithRetry(factory, retries - 1);
    }

    if (typeof window !== "undefined" && isChunkLoadError(error)) {
      try {
        const alreadyReloaded = window.sessionStorage.getItem(RELOAD_KEY);
        if (!alreadyReloaded) {
          console.error("[lazyWithRetry] chunk load failed, reloading once", error);
          window.sessionStorage.setItem(RELOAD_KEY, "1");
          window.location.reload();
          return new Promise<T>(() => {});
        }
      } catch {
        // noop
      }
    }

    throw error;
  }
}
