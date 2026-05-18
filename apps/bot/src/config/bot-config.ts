type RuntimeMode = "development" | "test" | "production";
type LogLevel = "debug" | "info" | "warn" | "error";
const TELEGRAM_ID_PLACEHOLDERS = new Set([
  "123456789",
  "PUT_ADMIN_TELEGRAM_ID_HERE",
  "PUT_TRAINER_TELEGRAM_ID_HERE",
]);

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

function getTelegramIdEnv(
  name: string,
  fallback: string,
  source: NodeJS.ProcessEnv = process.env,
): string {
  const value = source[name]?.trim();

  if (value && !TELEGRAM_ID_PLACEHOLDERS.has(value)) {
    return value;
  }

  return fallback;
}

function getBooleanEnv(
  name: string,
  fallback: boolean,
  source: NodeJS.ProcessEnv = process.env,
): boolean {
  const value = source[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  return value === "true" || value === "1" || value === "yes";
}

export interface BotRuntimeConfig {
  adminTelegramId: string;
  apiBaseUrl: string;
  dryRun: boolean;
  logLevel: LogLevel;
  nodeEnv: RuntimeMode;
  telegramBotToken: string;
  trainerTelegramId: string;
}

export function getBotRuntimeConfig(): BotRuntimeConfig {
  const adminTelegramId = getRequiredEnv("ADMIN_TELEGRAM_ID");

  return {
    adminTelegramId,
    apiBaseUrl: getOptionalEnv("API_BASE_URL", "http://localhost:3000"),
    dryRun: getBooleanEnv("BOT_DRY_RUN", true),
    logLevel: getOptionalEnv("BOT_LOG_LEVEL", "debug") as LogLevel,
    nodeEnv: getOptionalEnv("NODE_ENV", "development") as RuntimeMode,
    telegramBotToken: getRequiredEnv("TELEGRAM_BOT_TOKEN"),
    trainerTelegramId: getTelegramIdEnv("TRAINER_TELEGRAM_ID", adminTelegramId),
  };
}
