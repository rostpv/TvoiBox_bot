export function getRequiredEnv(name: string, source: NodeJS.ProcessEnv = process.env): string {
  const value = source[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(
  name: string,
  fallback: string,
  source: NodeJS.ProcessEnv = process.env,
): string {
  return source[name]?.trim() || fallback;
}

export function getBooleanEnv(
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

export function getNumberEnv(
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
