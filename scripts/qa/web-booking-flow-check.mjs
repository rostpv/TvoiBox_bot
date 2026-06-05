import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const PLACEHOLDER_TELEGRAM_IDS = new Set([
  "123456789",
  "PUT_TRAINER_TELEGRAM_ID_HERE",
  "PUT_ADMIN_TELEGRAM_ID_HERE",
]);

function parseEnv(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) {
      result[key] = value;
    }
  }

  return result;
}

async function loadEnvFromFile(envPath) {
  try {
    const envContent = await readFile(envPath, "utf8");
    return parseEnv(envContent);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

async function request(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();

  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    text,
    data,
  };
}

async function requestJson(url, options) {
  const result = await request(url, options);
  if (!result.ok) {
    throw new Error(`HTTP ${result.status} for ${url}: ${result.text}`);
  }

  return result.data;
}

function normalizeTelegramId(...candidates) {
  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (!value || PLACEHOLDER_TELEGRAM_IDS.has(value)) {
      continue;
    }

    return value;
  }

  return "";
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function toFullHourUtc(date) {
  const result = new Date(date);
  result.setUTCMinutes(0, 0, 0);
  return result;
}

async function openSlot(apiBaseUrl, trainerTelegramId, startAt) {
  const endAt = addHours(startAt, 1);

  await requestJson(`${apiBaseUrl}/slots/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trainerTelegramId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    }),
  });
}

async function createWebClientSession(apiBaseUrl, payload) {
  return requestJson(`${apiBaseUrl}/web/client/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function createWebTrainerSession(apiBaseUrl, secret) {
  return requestJson(`${apiBaseUrl}/web/trainer/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret }),
  });
}

async function ensureTelegramClient(apiBaseUrl, telegramId) {
  await requestJson(`${apiBaseUrl}/clients/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId,
      username: "web_booking_qa_telegram",
      fullName: "Web QA Telegram Client",
      phone: null,
      consentAccepted: true,
    }),
  });
}

async function listTelegramAvailableSlots(apiBaseUrl, telegramId) {
  return requestJson(
    `${apiBaseUrl}/slots/available?telegramId=${encodeURIComponent(telegramId)}`,
    { method: "GET" },
  );
}

async function requestTelegramBooking(apiBaseUrl, telegramId, slotId) {
  return request(`${apiBaseUrl}/bookings/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId,
      slotId,
      clientComment: "web-booking-flow-check telegram conflict",
    }),
  });
}

async function authJson(apiBaseUrl, path, token, options) {
  return requestJson(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

async function authRequest(apiBaseUrl, path, token, options) {
  return request(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

async function findSlotByStart(apiBaseUrl, token, expectedStartAt) {
  const slots = await authJson(apiBaseUrl, "/web/client/slots", token, { method: "GET" });
  return (slots || []).find((slot) => slot.startAt === expectedStartAt.toISOString()) ?? null;
}

async function main() {
  const rootDir = resolve(process.cwd());
  const envFile = await loadEnvFromFile(resolve(rootDir, ".env"));
  const apiBaseUrl = (process.env.API_BASE_URL || envFile.API_BASE_URL || "http://localhost:3000").replace(/\/$/u, "");
  const trainerTelegramId = normalizeTelegramId(
    process.env.TRAINER_TELEGRAM_ID,
    envFile.TRAINER_TELEGRAM_ID,
    process.env.ADMIN_TELEGRAM_ID,
    envFile.ADMIN_TELEGRAM_ID,
  );
  const webTrainerSecret = process.env.WEB_TRAINER_LOGIN_SECRET || envFile.WEB_TRAINER_LOGIN_SECRET;
  const telegramConflictClientId =
    process.env.WEB_BOOKING_QA_TELEGRAM_CLIENT_ID || `900${String(Date.now()).slice(-9)}`;

  if (!trainerTelegramId) {
    throw new Error("TRAINER_TELEGRAM_ID или ADMIN_TELEGRAM_ID обязателен для web booking QA");
  }
  if (!webTrainerSecret) {
    throw new Error("WEB_TRAINER_LOGIN_SECRET обязателен для web trainer QA");
  }

  const slotStartAt = addHours(toFullHourUtc(new Date()), 96);
  await openSlot(apiBaseUrl, trainerTelegramId, slotStartAt);
  await ensureTelegramClient(apiBaseUrl, telegramConflictClientId);

  const clientPhoneSuffix = String(Date.now()).slice(-8);
  const firstClientPhone =
    `+7 900 ${clientPhoneSuffix.slice(0, 3)} ${clientPhoneSuffix.slice(3, 5)} ${clientPhoneSuffix.slice(5, 7)}`;
  const secondClientPhone =
    `+7 901 ${clientPhoneSuffix.slice(0, 3)} ${clientPhoneSuffix.slice(3, 5)} ${clientPhoneSuffix.slice(5, 7)}`;
  const firstClient = await createWebClientSession(apiBaseUrl, {
    fullName: "Web QA Client",
    phone: firstClientPhone,
    email: "web-qa@example.com",
  });
  const firstClientPhoneOnlySession = await createWebClientSession(apiBaseUrl, {
    fullName: "",
    phone: firstClientPhone,
    email: null,
  });
  const secondClient = await createWebClientSession(apiBaseUrl, {
    fullName: "Web QA Conflict Client",
    phone: secondClientPhone,
    email: null,
  });

  if (firstClientPhoneOnlySession.profile.id !== firstClient.profile.id) {
    throw new Error("Phone-only web session did not resolve the existing client");
  }
  if (firstClientPhoneOnlySession.profile.fullName !== "Web QA Client") {
    throw new Error("Phone-only web session did not preserve the existing client name");
  }
  if (firstClientPhoneOnlySession.profile.email !== "web-qa@example.com") {
    throw new Error("Phone-only web session did not preserve the existing client email");
  }

  const slot = await findSlotByStart(apiBaseUrl, firstClient.token, slotStartAt);
  if (!slot) {
    throw new Error("Подготовленный слот не появился в /web/client/slots");
  }

  const bookingResponse = await authJson(apiBaseUrl, "/web/client/bookings/request", firstClient.token, {
    method: "POST",
    body: JSON.stringify({
      slotId: slot.id,
      clientComment: "web-booking-flow-check",
    }),
  });

  const conflictResponse = await authRequest(apiBaseUrl, "/web/client/bookings/request", secondClient.token, {
    method: "POST",
    body: JSON.stringify({
      slotId: slot.id,
      clientComment: "web-booking-flow-check conflict",
    }),
  });

  if (conflictResponse.ok) {
    throw new Error("Вторая web-заявка смогла занять уже удержанный слот");
  }

  const telegramSlotsWhileWebHeld = await listTelegramAvailableSlots(apiBaseUrl, telegramConflictClientId);
  const telegramSlotStillVisible = (telegramSlotsWhileWebHeld || []).some(
    (item) => item.startAt === slotStartAt.toISOString(),
  );
  if (telegramSlotStillVisible) {
    throw new Error("Слот, удержанный web-заявкой, всё ещё виден Telegram-клиенту");
  }

  const telegramConflictResponse = await requestTelegramBooking(apiBaseUrl, telegramConflictClientId, slot.id);
  if (telegramConflictResponse.ok) {
    throw new Error("Telegram-клиент смог занять слот, уже удержанный web-заявкой");
  }

  const trainerSession = await createWebTrainerSession(apiBaseUrl, webTrainerSecret);
  const pending = await authJson(apiBaseUrl, "/mini-app/trainer/bookings", trainerSession.token, { method: "GET" });
  const pendingBooking = (pending.items || []).find((item) => item.id === bookingResponse.booking.id);

  if (!pendingBooking) {
    throw new Error("Web-заявка не появилась в тренерском списке");
  }
  if (pendingBooking.source !== "WEB") {
    throw new Error(`Ожидался source WEB, получено ${pendingBooking.source}`);
  }
  if (pendingBooking.client.email !== "web-qa@example.com") {
    throw new Error("Email web-клиента не дошёл до тренерского DTO");
  }

  const confirmResult = await authJson(apiBaseUrl, "/mini-app/trainer/bookings/confirm", trainerSession.token, {
    method: "POST",
    body: JSON.stringify({
      bookingId: bookingResponse.booking.id,
    }),
  });

  if (confirmResult.status !== "confirmed" || confirmResult.booking.status !== "CONFIRMED") {
    throw new Error("Подтверждение web-заявки вернуло неожиданный статус");
  }

  const trainings = await authJson(apiBaseUrl, "/web/client/trainings", firstClient.token, { method: "GET" });
  const confirmedTraining = (trainings.items || []).find((item) => item.bookingId === bookingResponse.booking.id);
  if (!confirmedTraining || confirmedTraining.bookingStatus !== "CONFIRMED") {
    throw new Error("Подтверждённая web-запись не появилась в /web/client/trainings");
  }

  console.log("Web booking flow check: OK");
  console.log(`API base URL: ${apiBaseUrl}`);
  console.log(`Web booking: ${bookingResponse.booking.id}`);
  console.log(`Confirmed training starts at: ${confirmedTraining.startAt}`);
  console.log(`Telegram conflict client: ${telegramConflictClientId}`);
}

main().catch((error) => {
  console.error("Web booking flow check: FAILED");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
