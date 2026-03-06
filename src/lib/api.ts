import { NetworkError, ApiError, ConflictError, TimeoutError, AbortError } from "./errors";

const DEFAULT_TIMEOUT_MS = 30000;

/** Merge multiple AbortSignals, with fallback for browsers without AbortSignal.any() */
function mergeSignals(...signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") return AbortSignal.any(signals);
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const signal = options.signal
    ? mergeSignals(options.signal, controller.signal)
    : controller.signal;

  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      signal,
      headers: {
        // Only set Content-Type when there's a body (not for GET/DELETE)
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (options.signal?.aborted) throw new AbortError("Request aborted", path);
    if (controller.signal.aborted) {
      throw new TimeoutError("Request timed out. Is the server responsive?", path);
    }
    throw new NetworkError(
      "Cannot connect to server. Is the proxy running? (node server/proxy.js)",
      e,
      path,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    let msg = `Server error (${res.status})`;
    let body: Record<string, unknown> | undefined;
    try {
      body = await res.json();
      if (body?.errors && Array.isArray(body.errors)) {
        msg = (body.errors as string[]).join(", ");
      } else if (body?.error) {
        msg = String(body.error);
      }
    } catch {
      /* JSON parse failed — use default message */
    }

    if (res.status === 409) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new ConflictError(msg, body, (body as any)?.current_issue, path);
    }

    throw new ApiError(msg, res.status, body, path);
  }

  return res.json();
}
