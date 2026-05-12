import { Injectable } from "@nestjs/common";

type RuntimeMode = "development" | "test" | "production";
type LogLevel = "debug" | "info" | "warn" | "error";

const APP_TIMEZONE = "Europe/Moscow";

function getRequiredEnv(name: string, source: NodeJS.ProcessEnv = process.env): string {
  const value = source[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getOptionalEnv(
  name: string,
  fallback: string,
  source: NodeJS.ProcessEnv = process.env,
): string {
  return source[name]?.trim() || fallback;
}

function getNumberEnv(
  name: string,
  fallback: number,
  source: NodeJS.ProcessEnv = process.env,
): number {
  const rawValue = source[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }

  return parsed;
}

export interface ApiRuntimeConfig {
  name: string;
  host: string;
  port: number;
  databaseUrl: string;
  timezone: string;
  logLevel: LogLevel;
  nodeEnv: RuntimeMode;
  trainerTelegramId: string;
}

export function getApiRuntimeConfig(): ApiRuntimeConfig {
  return {
    name: getOptionalEnv("APP_NAME", "tvoy-box-training-scheduler"),
    host: getOptionalEnv("APP_HOST", "0.0.0.0"),
    port: getNumberEnv("APP_PORT", 3000),
    databaseUrl: getRequiredEnv("DATABASE_URL"),
    timezone: getOptionalEnv("TZ", APP_TIMEZONE),
    logLevel: getOptionalEnv("API_LOG_LEVEL", "debug") as LogLevel,
    nodeEnv: getOptionalEnv("NODE_ENV", "development") as RuntimeMode,
    trainerTelegramId: getRequiredEnv("TRAINER_TELEGRAM_ID"),
  };
}

@Injectable()
export class AppConfigService {
  private readonly config = getApiRuntimeConfig();

  get values(): ApiRuntimeConfig {
    return this.config;
  }
}
