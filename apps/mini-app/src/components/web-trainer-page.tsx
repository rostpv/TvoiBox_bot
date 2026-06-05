"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { MiniAppApi, MiniAppMeResponse, MiniAppSession, getMiniAppApiBaseUrl } from "../lib/mini-app-api";
import { TrainerMiniApp } from "./trainer-mini-app";

const WEB_TRAINER_TOKEN_KEY = "tvoy-box-web-trainer-token";

interface TrainerSessionResponse {
  status: "ok";
  token: string;
  session: MiniAppSession;
}

type ScreenState = "boot" | "login" | "ready" | "error";

export function WebTrainerPage() {
  const baseUrl = useMemo(() => getMiniAppApiBaseUrl(), []);
  const api = useMemo(() => new MiniAppApi(baseUrl), [baseUrl]);
  const [screen, setScreen] = useState<ScreenState>("boot");
  const [session, setSession] = useState<MiniAppMeResponse | null>(null);
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    (window as Window & { __TVOY_BOX_CLIENT_BOOTED?: boolean }).__TVOY_BOX_CLIENT_BOOTED = true;

    const savedToken = window.localStorage.getItem(WEB_TRAINER_TOKEN_KEY);

    if (!savedToken) {
      setScreen("login");
      return;
    }

    api.setToken(savedToken);
    void loadSession(savedToken);
  }, [api]);

  async function loadSession(token: string) {
    try {
      api.setToken(token);
      const response = await api.getMe();

      if (response.session.role !== "trainer") {
        throw new Error("Сессия не является тренерской");
      }

      setSession(response);
      setScreen("ready");
      setMessage(null);
    } catch (error) {
      api.setToken(null);
      window.localStorage.removeItem(WEB_TRAINER_TOKEN_KEY);
      setSession(null);
      setScreen("login");
      setMessage(error instanceof Error ? error.message : "Не удалось открыть web-кабинет");
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedSecret = secret.trim();
    if (!trimmedSecret) {
      setMessage("Введите секрет входа");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const response = await requestTrainerSession(baseUrl, trimmedSecret);
      window.localStorage.setItem(WEB_TRAINER_TOKEN_KEY, response.token);
      setSecret("");
      await loadSession(response.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось войти в web-кабинет");
    } finally {
      setIsBusy(false);
    }
  }

  function handleLogout() {
    api.setToken(null);
    window.localStorage.removeItem(WEB_TRAINER_TOKEN_KEY);
    setSession(null);
    setScreen("login");
    setMessage("Вы вышли из web-кабинета");
  }

  if (screen === "boot") {
    return (
      <main className="web-trainer-page">
        <section className="web-trainer-login">
          <span className="mini-kicker">Твой Бокс</span>
          <h1>Web-кабинет тренера</h1>
          <p>Проверяем сохранённую сессию...</p>
        </section>
      </main>
    );
  }

  if (screen === "ready" && session) {
    return (
      <main className="web-trainer-page web-trainer-page--ready">
        <div className="web-trainer-session-bar">
          <div>
            <span className="mini-kicker">Резервный канал</span>
            <strong>Web-кабинет тренера</strong>
          </div>
          <button className="secondary-button secondary-button-compact" type="button" onClick={handleLogout}>
            Выйти
          </button>
        </div>
        <TrainerMiniApp api={api} session={session} />
      </main>
    );
  }

  return (
    <main className="web-trainer-page">
      <section className="web-trainer-login">
        <span className="mini-kicker">Твой Бокс</span>
        <h1>Web-кабинет тренера</h1>
        <p>Резервный вход для управления заявками, слотами и расписанием без Telegram.</p>

        <form className="web-trainer-login-form" onSubmit={(event) => void handleLogin(event)}>
          <label className="field">
            <span className="field-label">Секрет входа</span>
            <input
              autoComplete="current-password"
              inputMode="text"
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Введите секрет"
            />
          </label>

          {message ? <p className="web-trainer-message">{message}</p> : null}

          <button className="primary-button web-trainer-login-button" disabled={isBusy} type="submit">
            {isBusy ? "Проверяем..." : "Войти"}
          </button>
        </form>
      </section>
    </main>
  );
}

async function requestTrainerSession(baseUrl: string, secret: string): Promise<TrainerSessionResponse> {
  const response = await fetch(`${baseUrl}/web/trainer/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ secret }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `API responded with status ${response.status}`);
  }

  return (await response.json()) as TrainerSessionResponse;
}
