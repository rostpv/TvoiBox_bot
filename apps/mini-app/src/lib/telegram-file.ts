export type CalendarOpenMode = "shared" | "downloaded";

function isTelegramMobileWebView(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent || "";
  return /Telegram/i.test(userAgent) && /Android|iPhone|iPad|iPod/i.test(userAgent);
}

function supportsFileShare(file: File): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  if (typeof navigator.share !== "function") {
    return false;
  }

  if (typeof navigator.canShare === "function") {
    return navigator.canShare({ files: [file] });
  }

  return false;
}

export async function openCalendarFile(blob: Blob, fileName: string): Promise<CalendarOpenMode> {
  const url = window.URL.createObjectURL(blob);
  const releaseUrl = () => {
    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 60_000);
  };

  if (isTelegramMobileWebView()) {
    const file = new File([blob], fileName, { type: "text/calendar;charset=utf-8" });
    if (supportsFileShare(file)) {
      await navigator.share({
        title: "Календарь тренировки",
        files: [file],
      });
      releaseUrl();
      return "shared";
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.type = "text/calendar";
    document.body.appendChild(link);
    link.click();
    link.remove();
    releaseUrl();
    return "downloaded";
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  releaseUrl();
  return "downloaded";
}
