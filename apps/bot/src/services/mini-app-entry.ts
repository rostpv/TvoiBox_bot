import { InlineKeyboard } from "grammy";

const CLIENT_MINI_APP_LABEL = "Открыть mini app";

export function buildClientMiniAppInlineKeyboard(miniAppUrl: string): InlineKeyboard | null {
  const normalizedUrl = miniAppUrl.trim();
  if (!normalizedUrl) {
    return null;
  }

  return new InlineKeyboard().webApp(CLIENT_MINI_APP_LABEL, normalizedUrl);
}

export function getClientMiniAppLabel(): string {
  return CLIENT_MINI_APP_LABEL;
}
