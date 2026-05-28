function isTelegramMobileWebView(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent || "";
  return /Telegram/i.test(userAgent) && /Android|iPhone|iPad|iPod/i.test(userAgent);
}

export function openExternalUrl(url: string): void {
  if (typeof window === "undefined") {
    return;
  }

  if (isTelegramMobileWebView() && window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(url);
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
