export type RuntimeMode = "development" | "test" | "production";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggerLike {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}
