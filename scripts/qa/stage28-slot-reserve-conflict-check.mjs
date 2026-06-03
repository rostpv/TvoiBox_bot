import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const MOSCOW_TIME_ZONE = "Europe/Moscow";
const PLACEHOLDER_TELEGRAM_IDS = new Set([
  "123456789",
  "PUT_TRAINER_TELEGRAM_ID_HERE",
  "PUT_ADMIN_TELEGRAM_ID_HERE",
]);
const MOSCOW_WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: MOSCOW_TIME_ZONE,
  weekday: "long",
});
const MOSCOW_HOUR_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: MOSCOW_TIME_ZONE,
  hour: "2-digit",
  hour12: false,
});
const MOSCOW_MINUTE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: MOSCOW_TIME_ZONE,
  minute: "2-digit",
});

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
    if (!key) {
      continue;
    }

    result[key] = value;
  }

  return result;
}

async function loadEnvFromFile(envPath) {
  const envContent = await readFile(envPath, "utf8");
  return parseEnv(envContent);
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

function toNextQuarterHourUtc(date) {
  const result = new Date(date);
  const minutes = result.getUTCMinutes();
  result.setUTCMinutes(Math.ceil(minutes / 15) * 15, 0, 0);
  if (result.getTime() < date.getTime()) {
    result.setUTCMinutes(result.getUTCMinutes() + 15, 0, 0);
  }

  return result;
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
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

async function ensureClient(apiBaseUrl, telegramId, label) {
  await requestJson(`${apiBaseUrl}/clients/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId,
      username: label,
      fullName: `Stage 28 ${label}`,
      phone: null,
      consentAccepted: true,
    }),
  });
}

async function getTrainerSettings(apiBaseUrl, trainerTelegramId) {
  const response = await requestJson(
    `${apiBaseUrl}/trainer-settings/current?trainerTelegramId=${encodeURIComponent(trainerTelegramId)}`,
    { method: "GET" },
  );

  return response.settings;
}

async function openSlot(apiBaseUrl, trainerTelegramId, startAt, durationMinutes) {
  const endAt = addMinutes(startAt, durationMinutes);
  return requestJson(`${apiBaseUrl}/slots/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trainerTelegramId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    }),
  });
}

async function listAvailableSlots(apiBaseUrl, telegramId) {
  return requestJson(
    `${apiBaseUrl}/slots/available?telegramId=${encodeURIComponent(telegramId)}`,
    { method: "GET" },
  );
}

async function findAvailableSlot(apiBaseUrl, telegramId, expectedStartAt) {
  const available = await listAvailableSlots(apiBaseUrl, telegramId);

  return (available || []).find((slot) => slot.startAt === expectedStartAt.toISOString()) ?? null;
}

async function requestBooking(apiBaseUrl, telegramId, slotId) {
  return request(`${apiBaseUrl}/bookings/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId,
      slotId,
    }),
  });
}

async function rejectBooking(apiBaseUrl, trainerTelegramId, bookingId) {
  return requestJson(`${apiBaseUrl}/bookings/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trainerTelegramId,
      bookingId,
      trainerComment: "stage28-reserve-conflict cleanup",
    }),
  });
}

function getMoscowWeekday(date) {
  return MOSCOW_WEEKDAY_FORMATTER.format(date).toLowerCase();
}

function getMoscowHour(date) {
  return Number(MOSCOW_HOUR_FORMATTER.format(date));
}

function getMoscowMinuteOfDay(date) {
  return getMoscowHour(date) * 60 + Number(MOSCOW_MINUTE_FORMATTER.format(date));
}

function pickNextWorkingSlot(now, settings) {
  const durationMinutes = settings.trainingDurationMinutes ?? 60;
  const startMinute = settings.workdayStartMinute ?? settings.workdayStartHour * 60;
  const endMinute = settings.workdayEndMinute ?? settings.workdayEndHour * 60;
  const startSearchAt = toNextQuarterHourUtc(addHours(now, settings.sameDayBookingCutoff + 1));
  const horizonSteps = Math.ceil((settings.bookingHorizonDays * 24 * 60) / durationMinutes);

  for (let offset = 0; offset < horizonSteps; offset += 1) {
    const candidate = addMinutes(startSearchAt, offset * durationMinutes);
    const weekday = getMoscowWeekday(candidate);
    const minuteOfDay = getMoscowMinuteOfDay(candidate);
    if (!settings.workingDays.includes(weekday)) {
      continue;
    }

    if (minuteOfDay < startMinute || minuteOfDay + durationMinutes > endMinute) {
      continue;
    }

    return candidate;
  }

  throw new Error("Не удалось подобрать тестовый слот внутри booking horizon и рабочих часов тренера");
}

function findSharedSlot(firstSlots, secondSlots) {
  const secondByStartAt = new Map((secondSlots || []).map((slot) => [slot.startAt, slot]));

  for (const firstSlot of firstSlots || []) {
    const secondSlot = secondByStartAt.get(firstSlot.startAt);
    if (!secondSlot) {
      continue;
    }

    return {
      firstSlot,
      secondSlot,
      startAt: new Date(firstSlot.startAt),
    };
  }

  return null;
}

async function main() {
  const rootDir = resolve(process.cwd());
  const envPath = resolve(rootDir, ".env");
  const envFile = await loadEnvFromFile(envPath);

  const apiBaseUrl = (process.env.API_BASE_URL || envFile.API_BASE_URL || "http://localhost:3000").replace(/\/$/u, "");
  const trainerTelegramId = normalizeTelegramId(
    process.env.TRAINER_TELEGRAM_ID,
    envFile.TRAINER_TELEGRAM_ID,
    process.env.ADMIN_TELEGRAM_ID,
    envFile.ADMIN_TELEGRAM_ID,
  );
  const clientOneTelegramId = process.env.STAGE28_CLIENT_ONE_TELEGRAM_ID || "900000000031";
  const clientTwoTelegramId = process.env.STAGE28_CLIENT_TWO_TELEGRAM_ID || "900000000032";

  if (!trainerTelegramId) {
    throw new Error("TRAINER_TELEGRAM_ID или ADMIN_TELEGRAM_ID обязателен для этой проверки");
  }

  await ensureClient(apiBaseUrl, clientOneTelegramId, "stage28-client-one");
  await ensureClient(apiBaseUrl, clientTwoTelegramId, "stage28-client-two");

  const trainerSettings = await getTrainerSettings(apiBaseUrl, trainerTelegramId);
  let firstVisibleSlot = null;
  let secondVisibleSlot = null;
  let targetSlotStart = null;
  const sharedVisibleSlot = findSharedSlot(
    await listAvailableSlots(apiBaseUrl, clientOneTelegramId),
    await listAvailableSlots(apiBaseUrl, clientTwoTelegramId),
  );

  if (sharedVisibleSlot) {
    firstVisibleSlot = sharedVisibleSlot.firstSlot;
    secondVisibleSlot = sharedVisibleSlot.secondSlot;
    targetSlotStart = sharedVisibleSlot.startAt;
  } else {
    targetSlotStart = pickNextWorkingSlot(new Date(), trainerSettings);
    await openSlot(apiBaseUrl, trainerTelegramId, targetSlotStart, trainerSettings.trainingDurationMinutes ?? 60);
    firstVisibleSlot = await findAvailableSlot(apiBaseUrl, clientOneTelegramId, targetSlotStart);
    secondVisibleSlot = await findAvailableSlot(apiBaseUrl, clientTwoTelegramId, targetSlotStart);
  }

  if (!firstVisibleSlot || !secondVisibleSlot) {
    throw new Error("Не удалось найти подготовленный слот в /slots/available для обоих клиентов");
  }

  const firstAttempt = await requestBooking(apiBaseUrl, clientOneTelegramId, firstVisibleSlot.id);
  if (!firstAttempt.ok) {
    throw new Error(`Первый клиент не смог создать заявку: HTTP ${firstAttempt.status} ${firstAttempt.text}`);
  }

  const firstBooking = firstAttempt.data?.booking;
  if (!firstBooking || firstAttempt.data?.status !== "created" || firstBooking.status !== "PENDING") {
    throw new Error("Первый клиент не получил ожидаемый PENDING booking");
  }

  const secondAttempt = await requestBooking(apiBaseUrl, clientTwoTelegramId, secondVisibleSlot.id);
  if (secondAttempt.ok) {
    throw new Error("Второй клиент неожиданно смог создать заявку на уже удерживаемый слот");
  }

  if (secondAttempt.status !== 409 || !secondAttempt.text.includes("Slot is not available")) {
    throw new Error(`Второй клиент получил неожиданный ответ: HTTP ${secondAttempt.status} ${secondAttempt.text}`);
  }

  const slotForSecondClientWhileHeld = await findAvailableSlot(apiBaseUrl, clientTwoTelegramId, targetSlotStart);
  if (slotForSecondClientWhileHeld) {
    throw new Error("Удерживаемый слот все еще виден второму клиенту в /slots/available");
  }

  const pending = await requestJson(
    `${apiBaseUrl}/bookings/pending?trainerTelegramId=${encodeURIComponent(trainerTelegramId)}`,
    { method: "GET" },
  );

  const pendingIds = new Set((pending.items || []).map((item) => item.id));
  if (!pendingIds.has(firstBooking.id)) {
    throw new Error("Заявка первого клиента не появилась в /bookings/pending");
  }

  const rejectResult = await rejectBooking(apiBaseUrl, trainerTelegramId, firstBooking.id);
  if (rejectResult.status !== "rejected" || rejectResult.booking.status !== "REJECTED") {
    throw new Error("Cleanup reject вернул неожиданный статус");
  }

  const slotVisibleAfterReject = await findAvailableSlot(apiBaseUrl, clientTwoTelegramId, targetSlotStart);
  if (!slotVisibleAfterReject) {
    throw new Error("После reject слот не вернулся в /slots/available");
  }

  console.log("Stage 28 slot reserve conflict check: OK");
  console.log(`API base URL: ${apiBaseUrl}`);
  console.log(`Trainer: ${trainerTelegramId}`);
  console.log(`Client one: ${clientOneTelegramId}`);
  console.log(`Client two: ${clientTwoTelegramId}`);
  console.log(`Held booking: ${firstBooking.id}`);
  console.log(`Slot start: ${targetSlotStart.toISOString()}`);
  console.log(`Trainer settings: ${JSON.stringify(trainerSettings)}`);
}

main().catch((error) => {
  const normalizedError = error;
  console.error("Stage 28 slot reserve conflict check: FAILED");
  console.error(normalizedError instanceof Error ? normalizedError.message : String(normalizedError));
  process.exitCode = 1;
});
