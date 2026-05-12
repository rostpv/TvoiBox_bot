import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerLike {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

const severityOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

interface LoggerOptions {
  scope: string;
  filePath: string;
  minLevel?: LogLevel;
}

interface LogRecord {
  timestamp: string;
  level: LogLevel;
  scope: string;
  message: string;
  context?: Record<string, unknown>;
}

export function createStructuredLogger(options: LoggerOptions): LoggerLike {
  const minLevel = options.minLevel ?? "info";
  mkdirSync(dirname(options.filePath), { recursive: true });

  const write = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
    if (severityOrder[level] < severityOrder[minLevel]) {
      return;
    }

    const record: LogRecord = {
      timestamp: new Date().toISOString(),
      level,
      scope: options.scope,
      message,
      context,
    };

    const serializedRecord = JSON.stringify(record);
    appendFileSync(options.filePath, `${serializedRecord}\n`, { encoding: "utf8" });

    if (level === "error") {
      console.error(serializedRecord);
      return;
    }

    if (level === "warn") {
      console.warn(serializedRecord);
      return;
    }

    console.log(serializedRecord);
  };

  return {
    debug: (message, context) => write("debug", message, context),
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context),
  };
}
