"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import {
  WebAvailableSlot,
  WebBookingApi,
  WebClientProfile,
  WebClientTraining,
} from "../lib/web-booking-api";

interface ClientFormState {
  fullName: string;
  phone: string;
  email: string;
}

type MessageTone = "success" | "error" | "info";

const SESSION_STORAGE_KEY = "tvoy-box-web-client-token";

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

function getStatusLabel(item: WebClientTraining): string {
  if (item.isAwaitingTrainerDecision) {
    return "ожидает подтверждения";
  }

  if (item.hasTrainerProposal) {
    return "предложен перенос";
  }

  switch (item.bookingStatus) {
    case "CONFIRMED":
      return "подтверждено";
    case "CANCELLED":
      return "отменено";
    case "REJECTED":
      return "отклонено";
    case "EXPIRED":
      return "истекло";
    default:
      return item.bookingStatus.toLowerCase();
  }
}

function getStatusTone(item: WebClientTraining): "pending" | "success" | "danger" | "muted" {
  if (item.isAwaitingTrainerDecision || item.hasTrainerProposal) {
    return "pending";
  }

  switch (item.bookingStatus) {
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
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [comment, setComment] = useState("");
  const [isBusy, setIsBusy] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: MessageTone; text: string } | null>(null);

  const slotGroups = groupSlotsByDay(slots);
  const upcomingRecords = records
    .filter((item) => new Date(item.endAt).getTime() >= Date.now())
    .sort((left, right) => left.startAt.localeCompare(right.startAt));

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
      await loadBookingContext();
    } catch {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      api.setToken(null);
      setProfile(null);
    } finally {
      setIsBusy(false);
    }
  };

  const loadBookingContext = async () => {
    const [nextSlots, nextRecords] = await Promise.all([
      api.getSlots(),
      api.getTrainings(),
    ]);
    setSlots(nextSlots);
    setRecords(nextRecords.items);
  };

  const handleStartSession = async (mode: "profile" | "phone-only" = "profile") => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await api.createSession({
        fullName: mode === "phone-only" ? "" : clientForm.fullName,
        phone: clientForm.phone,
        email: mode === "phone-only" ? null : clientForm.email || null,
      });
      window.localStorage.setItem(SESSION_STORAGE_KEY, response.token);
      setProfile(response.profile);
      setClientForm(toClientForm(response.profile));
      await loadBookingContext();
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
      });
      setProfile(response.profile);
      setClientForm(toClientForm(response.profile));
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
      await api.requestBooking({
        slotId: selectedSlotId,
        clientComment: comment || null,
      });
      setSelectedSlotId("");
      setComment("");
      await loadBookingContext();
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

  const handleLogout = () => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    api.setToken(null);
    setProfile(null);
    setSlots([]);
    setRecords([]);
    setSelectedSlotId("");
    setComment("");
    setClientForm({ fullName: "", phone: "", email: "" });
    setMessage({ tone: "info", text: "Данные на этом устройстве очищены." });
  };

  return (
    <main className="mini-app-page web-booking-page">
      <div className="mini-app-shell web-booking-shell">
        <header className="topbar web-booking-topbar">
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
            <button className="ghost-button" disabled={isSubmitting} onClick={handleLogout}>
              Выйти
            </button>
          ) : null}
        </header>

        {message ? (
          <div className={`alert alert-${message.tone === "error" ? "error" : message.tone === "success" ? "success" : "info"}`}>
            <p>{message.text}</p>
          </div>
        ) : null}

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
              <button className="primary-button" disabled={isSubmitting} onClick={() => void handleStartSession()}>
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

        {!isBusy && profile ? (
          <div className="content-grid web-booking-grid">
            <section className="panel web-booking-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Выбор времени</h2>
                  <p className="panel-text">Свободные слоты синхронизированы с Telegram mini app и расписанием тренера.</p>
                </div>
                <button className="secondary-button secondary-button-compact" disabled={isSubmitting} onClick={() => void loadBookingContext()}>
                  Обновить
                </button>
              </div>

              {slotGroups.length === 0 ? (
                <div className="empty-state">
                  <strong>Свободных слотов пока нет</strong>
                  <span>Попробуйте обновить список позже или свяжитесь с тренером вручную.</span>
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
                  <span className="field-label">Комментарий, необязательно</span>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Например: первая тренировка, удобнее после 18:00"
                  />
                </label>
                <button className="primary-button booking-submit-button" disabled={isSubmitting || !selectedSlotId} onClick={() => void handleRequestBooking()}>
                  Отправить заявку
                </button>
              </div>
            </section>

            <aside className="panel web-booking-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Ваши данные</h2>
                  <p className="panel-text">Сохранены только на этом устройстве.</p>
                </div>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Имя</span>
                  <input
                    value={clientForm.fullName}
                    onChange={(event) => setClientForm((current) => ({ ...current, fullName: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Телефон</span>
                  <input
                    value={clientForm.phone}
                    onChange={(event) => setClientForm((current) => ({ ...current, phone: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Email</span>
                  <input
                    value={clientForm.email}
                    onChange={(event) => setClientForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <button className="secondary-button" disabled={isSubmitting} onClick={() => void handleUpdateProfile()}>
                  Сохранить контакты
                </button>
              </div>

              <section className="panel panel-subsection web-records-panel">
                <div className="panel-header">
                  <div>
                    <h3 className="panel-title">Мои записи</h3>
                    <p className="panel-text">Здесь появляются актуальные заявки и подтверждения.</p>
                  </div>
                </div>

                {upcomingRecords.length === 0 ? (
                  <div className="empty-state">
                    <strong>Записей пока нет</strong>
                    <span>После отправки заявки она появится здесь.</span>
                  </div>
                ) : (
                  <div className="record-list">
                    {upcomingRecords.map((item) => (
                      <article className="record-card workout-card" key={item.bookingId}>
                        <div className="workout-card__head">
                          <div className="workout-card__summary">
                            <div className="workout-card__top">
                              <div className="workout-card__date">{formatDateTime(item.startAt)}</div>
                            </div>
                            <div className="workout-card__status" data-tone={getStatusTone(item)}>
                              {getStatusLabel(item)}
                            </div>
                          </div>
                        </div>
                        {item.trainerComment ? <p className="workout-card__comment">{item.trainerComment}</p> : null}
                        {item.bookingStatus === "CONFIRMED" && item.trainingStatus !== "CANCELLED" ? (
                          <div className="workout-card__actions">
                            <a className="status-button action-btn action-btn--secondary" href={api.getCalendarFileUrl(item.bookingId)}>
                              Добавить в календарь
                            </a>
                          </div>
                        ) : null}
                        {item.hasTrainerProposal ? (
                          <div className="workout-card__actions">
                            <button className="action-btn action-btn--secondary" disabled={isSubmitting} onClick={() => void handleAcceptProposal(item.bookingId)}>
                              Принять время
                            </button>
                            <button className="action-btn action-btn--danger-soft" disabled={isSubmitting} onClick={() => void handleDeclineProposal(item.bookingId)}>
                              Отклонить
                            </button>
                          </div>
                        ) : null}
                        {item.canCancel && item.bookingStatus !== "CANCELLED" ? (
                          <div className="workout-card__actions">
                            <button className="action-btn action-btn--danger-soft" disabled={isSubmitting} onClick={() => void handleCancelRecord(item.bookingId)}>
                              Отменить запись
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}
