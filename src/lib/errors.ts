export class AppError extends Error {
  readonly timestamp: number;
  readonly context?: string;

  constructor(message: string, context?: string) {
    super(message);
    this.name = "AppError";
    this.timestamp = Date.now();
    this.context = context;
  }
}

/** Network unreachable (fetch throws TypeError). */
export class NetworkError extends AppError {
  readonly originalError: unknown;

  constructor(message: string, originalError: unknown, context?: string) {
    super(message, context);
    this.name = "NetworkError";
    this.originalError = originalError;
  }
}

/** Server responded with 4xx/5xx. */
export class ApiError extends AppError {
  readonly status: number;
  readonly data?: unknown;

  constructor(message: string, status: number, data?: unknown, context?: string) {
    super(message, context);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/** 409 Conflict with current server-side issue. */
export class ConflictError extends ApiError {
  readonly currentIssue?: unknown;

  constructor(message: string, data?: unknown, currentIssue?: unknown, context?: string) {
    super(message, 409, data, context);
    this.name = "ConflictError";
    this.currentIssue = currentIssue;
  }
}

/** Request timed out (AbortSignal.timeout). */
export class TimeoutError extends AppError {
  constructor(message = "Request timed out", context?: string) {
    super(message, context);
    this.name = "TimeoutError";
  }
}

/** Request intentionally aborted (user navigation, new search). */
export class AbortError extends AppError {
  constructor(message = "Request aborted", context?: string) {
    super(message, context);
    this.name = "AbortError";
  }
}

/** localStorage quota exceeded or data corruption. */
export class StorageError extends AppError {
  readonly key: string;
  readonly operation: "read" | "write";

  constructor(message: string, key: string, operation: "read" | "write", context?: string) {
    super(message, context);
    this.name = "StorageError";
    this.key = key;
    this.operation = operation;
  }
}
