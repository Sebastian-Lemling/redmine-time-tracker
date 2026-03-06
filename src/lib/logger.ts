type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  error?: unknown;
  data?: Record<string, unknown>;
  timestamp: number;
}

const RING_BUFFER_SIZE = 100;
const buffer: LogEntry[] = [];
const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;

function addToBuffer(entry: LogEntry) {
  if (buffer.length >= RING_BUFFER_SIZE) buffer.shift();
  buffer.push(entry);
}

function formatPrefix(level: LogLevel, context?: string): string {
  const time = new Date().toISOString().slice(11, 23);
  const ctx = context ? ` [${context}]` : "";
  return `${time} ${level.toUpperCase()}${ctx}`;
}

function log(
  level: LogLevel,
  message: string,
  meta?: Partial<Omit<LogEntry, "level" | "message" | "timestamp">>,
) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: Date.now(),
    ...meta,
  };

  addToBuffer(entry);

  if (isDev) {
    const prefix = formatPrefix(level, meta?.context);
    const consoleFn =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : level === "debug"
            ? console.debug
            : console.info;

    if (meta?.error) {
      consoleFn(prefix, message, meta.error, meta.data ?? "");
    } else if (meta?.data) {
      consoleFn(prefix, message, meta.data);
    } else {
      consoleFn(prefix, message);
    }
  }
}

export const logger = {
  debug(message: string, meta?: Partial<Omit<LogEntry, "level" | "message" | "timestamp">>) {
    log("debug", message, meta);
  },
  info(message: string, meta?: Partial<Omit<LogEntry, "level" | "message" | "timestamp">>) {
    log("info", message, meta);
  },
  warn(message: string, meta?: Partial<Omit<LogEntry, "level" | "message" | "timestamp">>) {
    log("warn", message, meta);
  },
  error(message: string, meta?: Partial<Omit<LogEntry, "level" | "message" | "timestamp">>) {
    log("error", message, meta);
  },
  getBuffer(): readonly LogEntry[] {
    return [...buffer];
  },
  clearBuffer() {
    buffer.length = 0;
  },
};

export type { LogEntry, LogLevel };
