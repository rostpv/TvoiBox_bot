"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import {
  WebAvailableSlot,
  WebBookingApi,
  WebClientProfile,
  WebClientTraining,
  WebNoSlotRequest,
  WebNoSlotRequestStatus,
  WebSlotClosureInfo,
  WebTrainerSettings,
} from "../lib/web-booking-api";
import { openExternalUrl } from "../lib/telegram-link";

interface ClientFormState {
  fullName: string;
  phone: string;
  email: string;
}

interface NoSlotRequestFormState {
  preferredDays: string[];
  preferredTime: string;
  clientComment: string;
}

type MessageTone = "success" | "error" | "info";
type WebScreenId = "home" | "booking" | "records" | "profile" | "support";
type RecordsViewMode = "active" | "archive";

const SESSION_STORAGE_KEY = "tvoy-box-web-client-token";
const SUPPORT_TELEGRAM_URL = "https://t.me/RostPV";
const WEEKDAY_LABELS_RU: Record<string, string> = {
  monday: "Понедельник",
  tuesday: "Вторник",
  wednesday: "Среда",
  thursday: "Четверг",
  friday: "Пятница",
  saturday: "Суббота",
  sunday: "Воскресенье",
};

function formatHoursLabel(value: number): string {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;

  if (abs > 10 && abs < 20) {
    return `${value} часов`;
  }

  if (last === 1) {
    return `${value} час`;
  }

  if (last >= 2 && last <= 4) {
    return `${value} часа`;
  }

  return `${value} часов`;
}

function formatDaysLabel(value: number): string {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;

  if (abs > 10 && abs < 20) {
    return `${value} дней`;
  }

  if (last === 1) {
    return `${value} день`;
  }

  if (last >= 2 && last <= 4) {
    return `${value} дня`;
  }

  return `${value} дней`;
}

function formatDayLabel(dateIso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(dateIso));
}

function formatDateTime(dateIso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateIso));
}

function formatDateOnly(dateIso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
  }).format(new Date(dateIso));
}

function formatTime(dateIso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateIso));
}

function groupSlotsByDay(slots: WebAvailableSlot[]) {
  const groups = new Map<string, WebAvailableSlot[]>();

  for (const slot of slots) {
    const dayKey = slot.startAt.slice(0, 10);
    const current = groups.get(dayKey) ?? [];
    current.push(slot);
    groups.set(dayKey, current);
  }

  return [...groups.entries()].map(([dayKey, items]) => ({
    dayKey,
    title: formatDayLabel(items[0].startAt),
    items: items.sort((left, right) => left.startAt.localeCompare(right.startAt)),
  }));
}

function sortClientRecords(items: WebClientTraining[], view: RecordsViewMode): WebClientTraining[] {
  return [...items].sort((left, right) => view === "archive"
    ? right.startAt.localeCompare(left.startAt)
    : left.startAt.localeCompare(right.startAt));
}

function getNoSlotStatusLabel(status: WebNoSlotRequestStatus): string {
  switch (status) {
    case "NEW":
      return "Отправлен";
    case "REVIEWED":
      return "В работе";
    case "ARCHIVED":
      return "Закрыт";
  }
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21 12a9 9 0 1 1-2.64-6.36"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path d="M21 3v6h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="2.8" />
      <path d="M8 3v4M16 3v4M4 10h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.8" />
    </svg>
  );
}

function getStatusLabel(item: WebClientTraining): string {
  if (item.isAwaitingTrainerDecision) {
    return "ожидает подтверждения";
  }

  if (item.hasTrainerProposal) {
    return "предложен перенос";
  }

  switch (item.bookingStatus) {
    case "PENDING":
      return "ожидает подтверждения";
    case "CONFIRMED":
      return "подтверждено";
    case "RESCHEDULED":
      return "предложен перенос";
    case "CANCELLED":
      return "отменено";
    case "REJECTED":
      return "отклонено";
    case "EXPIRED":
      return "истекло";
  }
}

function getStatusTone(item: WebClientTraining): "pending" | "success" | "danger" | "muted" {
  if (item.isAwaitingTrainerDecision || item.hasTrainerProposal) {
    return "pending";
  }

  switch (item.bookingStatus) {
    case "PENDING":
    case "RESCHEDULED":
      return "pending";
    case "CONFIRMED":
      return "success";
    case "CANCELLED":
    case "REJECTED":
      return "danger";
    default:
      return "muted";
  }
}

function toClientForm(profile: WebClientProfile | null): ClientFormState {
  return {
    fullName: profile?.fullName ?? "",
    phone: profile?.phone ?? "",
    email: profile?.email ?? "",
  };
}

export function WebBookingPage() {
  const api = useMemo(() => new WebBookingApi(), []);
  const [profile, setProfile] = useState<WebClientProfile | null>(null);
  const [clientForm, setClientForm] = useState<ClientFormState>({
    fullName: "",
    phone: "",
    email: "",
  });
  const [slots, setSlots] = useState<WebAvailableSlot[]>([]);
  const [records, setRecords] = useState<WebClientTraining[]>([]);
  const [closureInfo, setClosureInfo] = useState<WebSlotClosureInfo | null>(null);
  const [bookingRules, setBookingRules] = useState<WebTrainerSettings | null>(null);
  const [noSlotRequests, setNoSlotRequests] = useState<WebNoSlotRequest[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [comment, setComment] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [recordsView, setRecordsView] = useState<RecordsViewMode>("active");
  const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(null);
  const [showNoSlotRequest, setShowNoSlotRequest] = useState(false);
  const [noSlotForm, setNoSlotForm] = useState<NoSlotRequestFormState>({
    preferredDays: [],
    preferredTime: "",
    clientComment: "",
  });
  const [screen, setScreen] = useState<WebScreenId>("home");
  const [isBusy, setIsBusy] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: MessageTone; text: string } | null>(null);

  const slotGroups = groupSlotsByDay(slots);
  const visibleRecords = sortClientRecords(records, recordsView);

  useEffect(() => {
    (window as Window & { __TVOY_BOX_CLIENT_BOOTED?: boolean }).__TVOY_BOX_CLIENT_BOOTED = true;

    const token = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!token) {
      setIsBusy(false);
      return;
    }

    api.setToken(token);
    void hydrateExistingSession();
  }, [api]);

  const hydrateExistingSession = async () => {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await api.getMe();
      setProfile(response.profile);
      setClientForm(toClientForm(response.profile));
      setConsentAccepted(Boolean(response.profile.consentAcceptedAt));
      await loadBookingContext();
      setScreen("home");
    } catch {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      api.setToken(null);
      setProfile(null);
    } finally {
      setIsBusy(false);
    }
  };

  const loadBookingContext = async (view = recordsView) => {
    const [nextSlots, nextClosureInfo, nextRules, nextNoSlotRequests, nextRecords] = await Promise.all([
      api.getSlots(),
      api.getClosureInfo(),
      api.getBookingRules(),
      api.getNoSlotRequests(),
      api.getTrainings({ includeArchived: view === "archive" }),
    ]);
    setSlots(nextSlots);
    setClosureInfo(nextClosureInfo);
    setBookingRules(nextRules.settings);
    setNoSlotRequests(nextNoSlotRequests.items);
    setRecords(sortClientRecords(nextRecords.items, view));
  };

  const loadRecords = async (view = recordsView) => {
    const nextRecords = await api.getTrainings({ includeArchived: view === "archive" });
    setRecords(sortClientRecords(nextRecords.items, view));
  };

  const handleStartSession = async (mode: "profile" | "phone-only" = "profile") => {
    if (mode === "profile" && !consentAccepted) {
      setMessage({ tone: "error", text: "Подтвердите согласие на обработку персональных данных." });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await api.createSession({
        fullName: mode === "phone-only" ? "" : clientForm.fullName,
        phone: clientForm.phone,
        email: mode === "phone-only" ? null : clientForm.email || null,
        consentAccepted: mode === "profile" ? consentAccepted : undefined,
      });
      window.localStorage.setItem(SESSION_STORAGE_KEY, response.token);
      setProfile(response.profile);
      setClientForm(toClientForm(response.profile));
      setConsentAccepted(Boolean(response.profile.consentAcceptedAt));
      await loadBookingContext();
      setScreen("home");
      setMessage({
        tone: "success",
        text:
          mode === "phone-only"
            ? "Данные найдены. Можно выбрать время тренировки."
            : "Данные сохранены. Можно выбрать время тренировки.",
      });
    } catch (error) {
      const normalizedError = error as Error;
      setMessage({ tone: "error", text: normalizedError.message || "Не удалось сохранить данные." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await api.updateProfile({
        fullName: clientForm.fullName,
        phone: clientForm.phone,
        email: clientForm.email || null,
        consentAccepted,
      });
      setProfile(response.profile);
      setClientForm(toClientForm(response.profile));
      setConsentAccepted(Boolean(response.profile.consentAcceptedAt));
      setMessage({ tone: "success", text: "Контакты обновлены." });
    } catch (error) {
      const normalizedError = error as Error;
      setMessage({ tone: "error", text: normalizedError.message || "Не удалось обновить контакты." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestBooking = async () => {
    if (!selectedSlotId) {
      setMessage({ tone: "error", text: "Выберите дату и время тренировки." });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      if (rescheduleBookingId) {
        await api.rescheduleTraining({
          bookingId: rescheduleBookingId,
          targetSlotId: selectedSlotId,
          clientComment: comment || undefined,
        });
        setRescheduleBookingId(null);
        setSelectedSlotId("");
        setComment("");
        await loadBookingContext();
        setScreen("records");
        setMessage({ tone: "success", text: "Запрос на перенос отправлен тренеру." });
        return;
      }

      await api.requestBooking({
        slotId: selectedSlotId,
        clientComment: comment || null,
      });
      setSelectedSlotId("");
      setComment("");
      await loadBookingContext();
      setScreen("records");
      setMessage({ tone: "success", text: "Заявка отправлена тренеру. Статус появится в списке записей." });
    } catch (error) {
      const normalizedError = error as Error;
      setMessage({ tone: "error", text: normalizedError.message || "Не удалось отправить заявку." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRecord = async (bookingId: string) => {
    const shouldCancel = window.confirm("Отменить эту запись?");
    if (!shouldCancel) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await api.cancelTraining({ bookingId });
      await loadBookingContext();
      setMessage({ tone: "success", text: "Запись отменена." });
    } catch (error) {
      const normalizedError = error as Error;
      setMessage({ tone: "error", text: normalizedError.message || "Не удалось отменить запись." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptProposal = async (bookingId: string) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await api.acceptProposal({ bookingId });
      await loadBookingContext();
      setMessage({ tone: "success", text: "Новое время подтверждено." });
    } catch (error) {
      const normalizedError = error as Error;
      setMessage({ tone: "error", text: normalizedError.message || "Не удалось принять перенос." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeclineProposal = async (bookingId: string) => {
    const shouldDecline = window.confirm("Отклонить предложенное время?");
    if (!shouldDecline) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await api.declineProposal({ bookingId });
      await loadBookingContext();
      setMessage({ tone: "success", text: "Предложенное время отклонено." });
    } catch (error) {
      const normalizedError = error as Error;
      setMessage({ tone: "error", text: normalizedError.message || "Не удалось отклонить перенос." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartReschedule = (bookingId: string) => {
    setRescheduleBookingId(bookingId);
    setSelectedSlotId("");
    setComment("");
    openScreen("booking");
  };

  const handleArchiveRecord = async (bookingId: string) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await api.archiveClientTraining({ bookingId });
      await loadRecords(recordsView);
      setMessage({ tone: "success", text: "Запись удалена из списка." });
    } catch (error) {
      const normalizedError = error as Error;
      setMessage({ tone: "error", text: normalizedError.message || "Не удалось удалить запись из списка." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordsViewChange = async (view: RecordsViewMode) => {
    setRecordsView(view);
    setIsSubmitting(true);
    setMessage(null);

    try {
      await loadRecords(view);
    } catch (error) {
      const normalizedError = error as Error;
      setMessage({ tone: "error", text: normalizedError.message || "Не удалось загрузить записи." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactTrainer = () => {
    openExternalUrl(SUPPORT_TELEGRAM_URL);
  };

  const handleNoSlotRequest = async () => {
    if (noSlotForm.preferredDays.length === 0) {
      setMessage({ tone: "error", text: "Выберите хотя бы один удобный день." });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await api.createNoSlotRequest({
        preferredDays: noSlotForm.preferredDays,
        preferredTime: noSlotForm.preferredTime || null,
        clientComment: noSlotForm.clientComment || null,
      });
      setShowNoSlotRequest(false);
      setNoSlotForm({
        preferredDays: [],
        preferredTime: "",
        clientComment: "",
      });
      const response = await api.getNoSlotRequests();
      setNoSlotRequests(response.items);
      setMessage({ tone: "success", text: "Запрос без слота отправлен. Тренер увидит ваши пожелания." });
    } catch (error) {
      const normalizedError = error as Error;
      setMessage({ tone: "error", text: normalizedError.message || "Не удалось отправить запрос без слота." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveNoSlotRequest = async (requestId: string) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await api.archiveNoSlotRequest({ requestId });
      const response = await api.getNoSlotRequests();
      setNoSlotRequests(response.items);
      setMessage({ tone: "success", text: "Запрос удалён из списка." });
    } catch (error) {
      const normalizedError = error as Error;
      setMessage({ tone: "error", text: normalizedError.message || "Не удалось удалить запрос." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    api.setToken(null);
    setProfile(null);
    setSlots([]);
    setRecords([]);
    setNoSlotRequests([]);
    setSelectedSlotId("");
    setComment("");
    setConsentAccepted(false);
    setRecordsView("active");
    setRescheduleBookingId(null);
    setShowNoSlotRequest(false);
    setNoSlotForm({ preferredDays: [], preferredTime: "", clientComment: "" });
    setClientForm({ fullName: "", phone: "", email: "" });
    setScreen("home");
    setMessage({ tone: "info", text: "Данные на этом устройстве очищены." });
  };

  const openScreen = (nextScreen: WebScreenId) => {
    setScreen(nextScreen);
    if (nextScreen === "booking") {
      void loadBookingContext(recordsView);
    }
    if (nextScreen === "records") {
      void loadRecords(recordsView);
    }
  };

  return (
    <main className="mini-app-page web-booking-page">
      <div className="mini-app-shell web-booking-shell">
        <header className={`topbar web-booking-topbar${profile && screen !== "home" ? " topbar-subpage" : ""}`}>
          <div className="brand">
            <Image className="brand-logo" src="/assets/logo-mark.png" alt="Твой Бокс" width={52} height={52} priority />
            <div className="brand-copy">
              <div className="brand-title">
                <span className="brand-title-main">ТВОЙ</span>
                <span className="brand-title-accent">БОКС</span>
              </div>
              <span className="brand-tagline">Твой путь к силе и уверенности</span>
            </div>
          </div>
          {profile ? (
            <div className="topbar-actions">
              <button
                className="icon-button"
                aria-label="Профиль"
                title="Профиль"
                data-tooltip="Профиль"
                disabled={isSubmitting}
                onClick={() => openScreen("profile")}
              >
                П
              </button>
              <button
                className="icon-button"
                aria-label="Помощь"
                title="Помощь"
                data-tooltip="Помощь"
                disabled={isSubmitting}
                onClick={() => openScreen("support")}
              >
                ?
              </button>
              <button className="ghost-button" disabled={isSubmitting} onClick={handleLogout}>
                Выйти
              </button>
            </div>
          ) : null}
        </header>

        {message ? (
          <div className={`alert alert-${message.tone === "error" ? "error" : message.tone === "success" ? "success" : "info"}`}>
            <p>{message.text}</p>
          </div>
        ) : null}

        {(!profile || screen === "home") ? (
          <section className="hero-card web-booking-hero">
            <div className="trainer-hero-grid">
              <div className="trainer-hero-copy">
                <p className="trainer-hero-eyebrow">ТВОЙ БОКС</p>
                <h1 className="trainer-thought-title">Сила начинается не с удара</h1>
                <p className="trainer-thought-lead">
                  Она начинается с уверенности в себе. Выберите удобный день и приходите на тренировку - без давления и
                  подготовки.
                </p>
              </div>
              <div className="trainer-frame web-booking-photo">
                <Image className="trainer-photo" src="/assets/trainer.png" alt="Тренер Твой Бокс" width={240} height={300} priority />
              </div>
            </div>
          </section>
        ) : null}

        {isBusy ? (
          <section className="panel">
            <div className="loader-state loader-state-compact">
              <strong>Загружаем запись</strong>
              <span>Проверяем сохранённые данные на этом устройстве.</span>
            </div>
          </section>
        ) : null}

        {!isBusy && !profile ? (
          <section className="panel web-booking-panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Контакты для записи</h2>
                <p className="panel-text">Телефон нужен тренеру, чтобы подтвердить заявку и связаться при переносе.</p>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                <span className="field-label">Имя</span>
                <input
                  autoComplete="name"
                  value={clientForm.fullName}
                  onChange={(event) => setClientForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Как к вам обращаться"
                />
              </label>
              <label className="field">
                <span className="field-label">Телефон</span>
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  value={clientForm.phone}
                  onChange={(event) => setClientForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="+7 900 000 00 00"
                />
              </label>
              <label className="field">
                <span className="field-label">Email, необязательно</span>
                <input
                  autoComplete="email"
                  inputMode="email"
                  value={clientForm.email}
                  onChange={(event) => setClientForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="name@example.com"
                />
              </label>
              <label className="checkbox-row checkbox-row-soft">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(event) => setConsentAccepted(event.target.checked)}
                />
                <span>Согласие на обработку персональных данных</span>
              </label>
              {!consentAccepted ? <p className="consent-note">Без согласия нельзя создать новую web-регистрацию.</p> : null}
              <button className="primary-button" disabled={isSubmitting || !consentAccepted} onClick={() => void handleStartSession()}>
                Продолжить
              </button>
              <button
                className="secondary-button"
                disabled={isSubmitting || !clientForm.phone.trim()}
                onClick={() => void handleStartSession("phone-only")}
              >
                Найти по телефону
              </button>
            </div>
          </section>
        ) : null}

        {!isBusy && profile && screen === "home" ? (
          <section className="home-actions-grid home-actions-grid-compact">
            <article className="action-card action-card-home">
              <strong>Запись</strong>
              <p>Выберите удобный день, время и отправьте запрос тренеру.</p>
              <button className="primary-button action-card-button" disabled={isSubmitting} onClick={() => openScreen("booking")}>
                Перейти к слотам
              </button>
            </article>

            <article className="action-card action-card-home">
              <strong>Мои тренировки</strong>
              <p>Следите за заявками, подтверждениями, переносами и отменами в одном месте.</p>
              <button className="secondary-button action-card-button" disabled={isSubmitting} onClick={() => openScreen("records")}>
                Открыть список
              </button>
            </article>

            <article className="action-card action-card-home">
              <strong>Связь с тренером</strong>
              <p>Если хочется что-то обсудить, можно быстро написать тренеру в Telegram.</p>
              <button className="secondary-button support-link-button action-card-button" type="button" onClick={handleContactTrainer}>
                Написать тренеру
              </button>
            </article>
          </section>
        ) : null}

        {!isBusy && profile && screen === "booking" ? (
          <section className="panel booking-panel web-booking-panel">
            <div className="booking-header">
              <button
                className="back-link"
                disabled={isSubmitting}
                onClick={() => {
                  setRescheduleBookingId(null);
                  setSelectedSlotId("");
                  setComment("");
                  openScreen(rescheduleBookingId ? "records" : "home");
                }}
              >
                ← Назад
              </button>
              <div>
                <h2 className="panel-title">{rescheduleBookingId ? "Перенос записи" : "Запись на тренировку"}</h2>
                <p className="panel-text">
                  {rescheduleBookingId
                    ? "Выберите новое удобное время, и тренер получит запрос на перенос."
                    : "Выберите удобный день и время для занятия."}
                </p>
                {bookingRules ? (
                  <p className="booking-rules-note">
                    Запись открыта на {formatDaysLabel(bookingRules.bookingHorizonDays)} вперёд.
                    {bookingRules.sameDayBookingCutoff > 0
                      ? ` В день тренировки запись закрывается за ${formatHoursLabel(bookingRules.sameDayBookingCutoff)} до начала.`
                      : " В день тренировки запись доступна до начала занятия."}
                  </p>
                ) : null}
              </div>
              <button
                className="secondary-button secondary-button-compact action-btn--icon-tight"
                aria-label="Обновить слоты"
                title="Обновить"
                disabled={isSubmitting}
                onClick={() => void loadBookingContext()}
              >
                <RefreshIcon />
              </button>
            </div>

            <label className="checkbox-row checkbox-row-soft">
              <input
                type="checkbox"
                checked={consentAccepted}
                disabled={isSubmitting}
                onChange={(event) => setConsentAccepted(event.target.checked)}
              />
              <span>Согласие на обработку персональных данных</span>
            </label>
            {!consentAccepted ? <p className="consent-note">После подтверждения согласия можно выбрать дату и время тренировки.</p> : null}

            {closureInfo?.hasClosure ? (
              <div className="alert alert-info">
                <div>
                  <strong>Часть слотов сейчас закрыта</strong>
                  <p>{closureInfo.reason || "Тренер временно закрыл часть времени для записи."}</p>
                </div>
              </div>
            ) : null}

            {slotGroups.length === 0 ? (
              <div className="empty-state">
                <strong>Свободных слотов пока нет</strong>
                <span>Можно сразу отправить запрос без слота и указать удобные дни.</span>
                <button className="secondary-button secondary-button-compact" onClick={() => setShowNoSlotRequest(true)}>
                  Открыть запрос без слота
                </button>
              </div>
            ) : (
              <div className="booking-groups">
                {slotGroups.map((group) => (
                  <section className="slot-day slot-day-compact" key={group.dayKey}>
                    <div className="slot-day-header">
                      <h3 className="slot-day-title">{group.title.replace(",", " ·")}</h3>
                    </div>
                    <div className="time-grid">
                      {group.items.map((slot) => (
                        <button
                          className="time-button"
                          data-active={selectedSlotId === slot.id}
                          key={slot.id}
                          disabled={!consentAccepted}
                          onClick={() => setSelectedSlotId(slot.id)}
                        >
                          {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            <div className="form-grid booking-form-grid web-booking-submit">
              <label className="field">
                <span className="field-label">Комментарий к заявке</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="например: удобнее после 18:00"
                />
              </label>
              <div className="booking-actions">
                <button className="primary-button booking-submit-button" disabled={isSubmitting || !selectedSlotId || !consentAccepted} onClick={() => void handleRequestBooking()}>
                  {rescheduleBookingId ? "Отправить запрос на перенос" : "Записаться"}
                </button>
                <button
                  className="secondary-button secondary-button-compact"
                  disabled={isSubmitting}
                  onClick={() => setShowNoSlotRequest((current) => !current)}
                >
                  {showNoSlotRequest ? "Скрыть запрос" : "Нет подходящего времени"}
                </button>
              </div>
            </div>

            {showNoSlotRequest ? (
              <section className="panel no-slot-panel">
                <div className="no-slot-header">
                  <h3 className="panel-title">Запрос без слота</h3>
                  <p className="panel-text">
                    Не нашли подходящее время? Укажите удобные дни и диапазон времени, а тренер поможет подобрать вариант.
                  </p>
                </div>

                <div className="no-slot-step">
                  <span className="step-label">Шаг 1</span>
                  <h4 className="step-title">Удобные дни</h4>
                  <div className="chip-group chip-group-soft">
                    {Object.entries(WEEKDAY_LABELS_RU).map(([value, label]) => {
                      const active = noSlotForm.preferredDays.includes(value);
                      return (
                        <button
                          key={value}
                          className="chip-button chip-button-soft"
                          data-active={active}
                          onClick={() =>
                            setNoSlotForm((current) => ({
                              ...current,
                              preferredDays: active
                                ? current.preferredDays.filter((item) => item !== value)
                                : [...current.preferredDays, value],
                            }))
                          }
                          type="button"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="no-slot-step">
                  <span className="step-label">Шаг 2</span>
                  <h4 className="step-title">Предпочтительное время</h4>
                  <label className="field">
                    <input
                      value={noSlotForm.preferredTime}
                      onChange={(event) => setNoSlotForm((current) => ({ ...current, preferredTime: event.target.value }))}
                      placeholder="например: после 19:00 или утром"
                    />
                  </label>
                </div>

                <div className="no-slot-step">
                  <span className="step-label">Шаг 3</span>
                  <h4 className="step-title">Комментарий (необязательно)</h4>
                  <label className="field">
                    <textarea
                      value={noSlotForm.clientComment}
                      onChange={(event) => setNoSlotForm((current) => ({ ...current, clientComment: event.target.value }))}
                      placeholder="дополнительные пожелания"
                    />
                  </label>
                </div>

                <button className="primary-button no-slot-submit-button" disabled={isSubmitting} onClick={() => void handleNoSlotRequest()}>
                  Отправить запрос
                </button>
              </section>
            ) : null}

            {noSlotRequests.length > 0 ? (
              <section className="panel no-slot-panel">
                <div className="no-slot-header">
                  <h3 className="panel-title">Запросы без слота</h3>
                  <p className="panel-text">Здесь появится ответ тренера, если он оставит комментарий к вашему запросу.</p>
                </div>

                <div className="record-list">
                  {noSlotRequests.slice(0, 5).map((item) => (
                    <article className="record-card" key={item.id}>
                      <div className="record-card-head">
                        <div>
                          <h4 className="record-title">Удобные дни: {item.preferredDays.map((day) => WEEKDAY_LABELS_RU[day] ?? day).join(", ")}</h4>
                          <p className="record-meta">{item.preferredTime ? `Время: ${item.preferredTime}` : `Создан: ${formatDateTime(item.createdAt)}`}</p>
                        </div>
                        <span className="status-pill" data-tone={item.status === "NEW" ? "pending" : item.status === "ARCHIVED" ? "muted" : "success"}>
                          {getNoSlotStatusLabel(item.status)}
                        </span>
                      </div>
                      {item.clientComment ? <p className="record-comment">Ваш комментарий: {item.clientComment}</p> : null}
                      {item.trainerComment ? <p className="record-comment">Комментарий тренера: {item.trainerComment}</p> : null}
                      <div className="record-actions">
                        <button className="secondary-button" disabled={isSubmitting} onClick={() => void handleArchiveNoSlotRequest(item.id)}>
                          Удалить запрос
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </section>
        ) : null}

        {!isBusy && profile && screen === "support" ? (
          <section className="panel web-booking-panel">
            <div className="panel-header panel-header-compact panel-header-slim panel-header-top-actions">
              <div className="panel-header-row">
                <button className="back-link back-link-inline" disabled={isSubmitting} onClick={() => openScreen("home")}>
                  ← Назад
                </button>
              </div>
              <div className="panel-header-copy panel-header-copy-wide">
                <h2 className="panel-title">Помощь</h2>
                <p className="panel-text">Коротко о записи и связи с тренером.</p>
              </div>
            </div>

            <ul className="support-list">
              <li>Если подходящего времени нет, отправьте запрос без слота с удобными днями и диапазоном времени.</li>
              <li>Все актуальные статусы по заявкам и тренировкам собраны в разделе «Мои тренировки».</li>
              <li>Чтобы тренеру было проще связаться, лучше заранее заполнить имя, телефон и email в профиле.</li>
            </ul>

            <div className="support-contact">
              <p className="panel-text">Если есть вопрос или хочется что-то обсудить, просто напишите тренеру в Telegram.</p>
              <button className="secondary-button support-link-button" type="button" onClick={handleContactTrainer}>
                Написать тренеру
              </button>
            </div>
          </section>
        ) : null}

        {!isBusy && profile && screen === "profile" ? (
          <section className="panel web-booking-panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Профиль</h2>
                <p className="panel-text">Заполни данные для связи и быстрой записи.</p>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                <span className="field-label">Имя</span>
                <input
                  value={clientForm.fullName}
                  onChange={(event) => setClientForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Как к вам обращаться"
                />
              </label>
              <label className="field">
                <span className="field-label">Телефон</span>
                <input
                  value={clientForm.phone}
                  onChange={(event) => setClientForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="+7..."
                />
              </label>
              <label className="field">
                <span className="field-label">Email, необязательно</span>
                <input
                  value={clientForm.email}
                  onChange={(event) => setClientForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="name@example.com"
                />
              </label>
              <label className="checkbox-row checkbox-row-soft">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(event) => setConsentAccepted(event.target.checked)}
                />
                <span>Согласие на обработку персональных данных</span>
              </label>
              <div className="record-actions">
                <button className="primary-button" disabled={isSubmitting} onClick={() => void handleUpdateProfile()}>
                  Сохранить профиль
                </button>
                <button className="secondary-button" disabled={isSubmitting} onClick={() => openScreen("home")}>
                  Назад
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {!isBusy && profile && screen === "records" ? (
          <section className="panel web-booking-panel">
            <div className="panel-header panel-header-compact panel-header-slim panel-header-top-actions">
              <div className="panel-header-row">
                <button className="back-link back-link-inline" disabled={isSubmitting} onClick={() => openScreen("home")}>
                  ← Назад
                </button>
                <div className="panel-header-actions panel-header-actions-tight">
                  <button
                    className="chip-button chip-button-compact header-toggle-button"
                    data-active={recordsView === "active" ? "true" : "false"}
                    disabled={isSubmitting}
                    onClick={() => void handleRecordsViewChange("active")}
                  >
                    Актуальные
                  </button>
                  <button
                    className="chip-button chip-button-compact header-toggle-button"
                    data-active={recordsView === "archive" ? "true" : "false"}
                    disabled={isSubmitting}
                    onClick={() => void handleRecordsViewChange("archive")}
                  >
                    Архив
                  </button>
                  <button
                    className="secondary-button secondary-button-compact header-action-button action-btn--icon-tight"
                    aria-label="Обновить записи"
                    title="Обновить"
                    disabled={isSubmitting}
                    onClick={() => void loadRecords(recordsView)}
                  >
                    <RefreshIcon />
                  </button>
                </div>
              </div>
              <div className="panel-header-copy panel-header-copy-wide">
                <h2 className="panel-title">Мои записи</h2>
                <p className="panel-text">
                  {recordsView === "archive"
                    ? "Здесь хранятся прошедшие тренировки, которые автоматически ушли из активного списка."
                    : "Здесь собраны актуальные тренировки и текущие статусы по ним."}
                </p>
              </div>
            </div>

            {visibleRecords.length === 0 ? (
              <div className="empty-state">
                <strong>{recordsView === "archive" ? "Архив пока пуст" : "Пока нет актуальных записей"}</strong>
                <span>
                  {recordsView === "archive"
                    ? "Прошедшие тренировки появятся здесь автоматически."
                    : "Когда будете готовы, можно сразу вернуться к выбору времени."}
                </span>
                {recordsView === "active" ? (
                  <button className="primary-button booking-submit-button" onClick={() => openScreen("booking")}>
                    Перейти к записи
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="record-list">
                {visibleRecords.map((item) => {
                  const isPastConfirmedTraining = item.bookingStatus === "CONFIRMED"
                    && item.trainingStatus === "SCHEDULED"
                    && new Date(item.endAt).getTime() <= Date.now();
                  const primaryComment = item.trainerComment
                    ? `Комментарий: ${item.trainerComment}`
                    : item.clientComment
                      ? `Комментарий: ${item.clientComment}`
                      : isPastConfirmedTraining && !item.canCancel && !item.canReschedule
                        ? "Тренировка уже прошла, поэтому её нельзя перенести или отменить."
                        : null;

                  return (
                    <article className="record-card workout-card" key={item.bookingId}>
                      <div className="workout-card__head">
                        <div className="workout-card__summary">
                          <div className="workout-card__top">
                            <div className="workout-card__date">{formatDateOnly(item.startAt)}</div>
                            <div className="workout-card__time">{formatTime(item.startAt)}</div>
                          </div>
                          <div className="workout-card__status" data-tone={getStatusTone(item)}>
                            {getStatusLabel(item)}
                          </div>
                        </div>
                      </div>
                      {primaryComment ? <p className="workout-card__comment">{primaryComment}</p> : null}
                      {item.bookingStatus === "CONFIRMED" && item.trainingStatus !== "CANCELLED" && !item.isAwaitingTrainerDecision ? (
                        <div className="workout-card__actions">
                          <a
                            className="status-button action-btn action-btn--secondary action-btn--icon action-btn--icon-tight"
                            href={api.getCalendarFileUrl(item.bookingId)}
                            aria-label="Добавить в календарь"
                            title="Добавить в календарь"
                          >
                            <CalendarIcon />
                          </a>
                        </div>
                      ) : null}
                      {recordsView === "active" ? (
                        <div className="workout-card__actions">
                          {item.canReschedule ? (
                            <button className="status-button action-btn action-btn--secondary" disabled={isSubmitting} onClick={() => handleStartReschedule(item.bookingId)}>
                              Перенести
                            </button>
                          ) : null}
                          {item.canCancel ? (
                            <button
                              className={item.isAwaitingTrainerDecision ? "status-button action-btn action-btn--danger-soft" : "status-button action-btn action-btn--danger"}
                              disabled={isSubmitting}
                              onClick={() => void handleCancelRecord(item.bookingId)}
                            >
                              {item.isAwaitingTrainerDecision ? "Отменить заявку" : "Отменить"}
                            </button>
                          ) : null}
                          {item.hasTrainerProposal ? (
                            <>
                              <button className="status-button action-btn action-btn--secondary" disabled={isSubmitting} onClick={() => void handleAcceptProposal(item.bookingId)}>
                                Принять перенос
                              </button>
                              <button className="status-button action-btn action-btn--danger-soft" disabled={isSubmitting} onClick={() => void handleDeclineProposal(item.bookingId)}>
                                Отклонить
                              </button>
                            </>
                          ) : null}
                          {item.canDelete ? (
                            <button className="status-button action-btn action-btn--secondary" disabled={isSubmitting} onClick={() => void handleArchiveRecord(item.bookingId)}>
                              Удалить из списка
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="workout-card__actions">
                          <button className="status-button action-btn action-btn--danger-soft" disabled={isSubmitting} onClick={() => void handleArchiveRecord(item.bookingId)}>
                            Удалить
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
