import { getMiniAppApiBaseUrl } from "./mini-app-api";

export interface WebClientProfile {
  id: string;
  telegramId: string;
  username: string | null;
  fullName: string;
  phone: string | null;
  phoneNormalized: string | null;
  email: string | null;
  note: string | null;
  consentAcceptedAt: string | null;
  isBlacklisted: boolean;
}

export interface WebAvailableSlot {
  id: string;
  startAt: string;
  endAt: string;
  status: "OPEN" | "HELD" | "BOOKED" | "CLOSED" | "CANCELLED";
}

export interface WebSlotClosureInfo {
  hasClosure: boolean;
  reason: string | null;
  closedFrom: string | null;
  closedUntil: string | null;
  closedSlotsCount: number;
}

export interface WebTrainerSettings {
  bookingHorizonDays: number;
  sameDayBookingCutoff: number;
  workingDays: string[];
  workdayStartHour: number;
  workdayEndHour: number;
  trainingDurationMinutes: number;
  workdayStartMinute: number;
  workdayEndMinute: number;
  updatedAt: string;
}

export type WebBookingStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "EXPIRED" | "CANCELLED" | "RESCHEDULED";
export type WebNoSlotRequestStatus = "NEW" | "REVIEWED" | "ARCHIVED";

export interface WebClientTraining {
  bookingId: string;
  bookingStatus: WebBookingStatus;
  trainingStatus: "SCHEDULED" | "CANCELLED" | "COMPLETED" | "RESCHEDULED" | null;
  startAt: string;
  endAt: string;
  clientCalendarIcsUrl: string | null;
  trainerComment: string | null;
  clientComment: string | null;
  isAwaitingTrainerDecision: boolean;
  hasTrainerProposal: boolean;
  canCancel: boolean;
  canReschedule: boolean;
  canDelete: boolean;
}

export interface WebNoSlotRequest {
  id: string;
  status: WebNoSlotRequestStatus;
  preferredDays: string[];
  preferredTime: string | null;
  clientComment: string | null;
  trainerComment: string | null;
  createdAt: string;
  client: WebClientProfile;
}

interface SessionResponse {
  status: "ok";
  token: string;
  profile: WebClientProfile;
}

interface ProfileResponse {
  status: "ok" | "updated";
  profile: WebClientProfile;
}

interface TrainingsResponse {
  status: "ok";
  items: WebClientTraining[];
}

interface CreateBookingResponse {
  status: "created";
  booking: {
    id: string;
    slotId: string;
    status: WebBookingStatus;
    expiresAt: string;
    startAt: string;
    endAt: string;
  };
}

interface CreateNoSlotRequestResponse {
  status: "created";
  request: WebNoSlotRequest;
}

interface NoSlotRequestsResponse {
  status: "ok";
  items: WebNoSlotRequest[];
}

interface TrainerSettingsResponse {
  status: "ok" | "updated";
  settings: WebTrainerSettings;
}

interface BookingActionResponse {
  status: "confirmed" | "rejected" | "proposed" | "cancelled" | "rescheduled" | "resynced" | "archived";
}

export class WebBookingApi {
  private readonly baseUrl = getMiniAppApiBaseUrl();
  private token: string | null = null;

  setToken(token: string | null): void {
    this.token = token;
  }

  getCalendarFileUrl(bookingId: string): string {
    const token = this.requireToken();
    return `${this.baseUrl}/web/client/trainings/calendar?bookingId=${encodeURIComponent(bookingId)}&accessToken=${encodeURIComponent(token)}`;
  }

  async createSession(payload: {
    fullName: string;
    phone: string;
    email?: string | null;
    consentAccepted?: boolean;
  }): Promise<SessionResponse> {
    const response = await this.request<SessionResponse>("/web/client/session", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    this.setToken(response.token);
    return response;
  }

  async getMe(): Promise<ProfileResponse> {
    return this.authRequest<ProfileResponse>("/web/client/me", { method: "GET" });
  }

  async updateProfile(payload: {
    fullName: string;
    phone: string;
    email?: string | null;
    consentAccepted?: boolean;
  }): Promise<ProfileResponse> {
    return this.authRequest<ProfileResponse>("/web/client/me", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getSlots(): Promise<WebAvailableSlot[]> {
    return this.authRequest<WebAvailableSlot[]>("/web/client/slots", { method: "GET" });
  }

  async getClosureInfo(): Promise<WebSlotClosureInfo> {
    return this.authRequest<WebSlotClosureInfo>("/web/client/closure-info", { method: "GET" });
  }

  async getBookingRules(): Promise<TrainerSettingsResponse> {
    return this.authRequest<TrainerSettingsResponse>("/web/client/booking-rules", { method: "GET" });
  }

  async requestBooking(payload: {
    slotId: string;
    clientComment?: string | null;
  }): Promise<CreateBookingResponse> {
    return this.authRequest<CreateBookingResponse>("/web/client/bookings/request", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getTrainings(params?: { includeArchived?: boolean }): Promise<TrainingsResponse> {
    const search = new URLSearchParams();
    if (params?.includeArchived) {
      search.set("includeArchived", "true");
    }
    const suffix = search.toString() ? `?${search.toString()}` : "";

    return this.authRequest<TrainingsResponse>(`/web/client/trainings${suffix}`, { method: "GET" });
  }

  async cancelTraining(payload: { bookingId: string; clientComment?: string }): Promise<BookingActionResponse> {
    return this.authRequest<BookingActionResponse>("/web/client/trainings/cancel", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async rescheduleTraining(payload: {
    bookingId: string;
    targetSlotId: string;
    clientComment?: string;
  }): Promise<BookingActionResponse> {
    return this.authRequest<BookingActionResponse>("/web/client/trainings/reschedule", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async archiveClientTraining(payload: { bookingId: string }): Promise<BookingActionResponse> {
    return this.authRequest<BookingActionResponse>("/web/client/trainings/archive", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async createNoSlotRequest(payload: {
    preferredDays: string[];
    preferredTime?: string | null;
    clientComment?: string | null;
  }): Promise<CreateNoSlotRequestResponse> {
    return this.authRequest<CreateNoSlotRequestResponse>("/web/client/no-slot-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getNoSlotRequests(): Promise<NoSlotRequestsResponse> {
    return this.authRequest<NoSlotRequestsResponse>("/web/client/no-slot-requests", { method: "GET" });
  }

  async archiveNoSlotRequest(payload: { requestId: string }): Promise<{ status: "updated"; request: WebNoSlotRequest }> {
    return this.authRequest<{ status: "updated"; request: WebNoSlotRequest }>("/web/client/no-slot-requests/archive", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async acceptProposal(payload: { bookingId: string; decisionNote?: string }): Promise<BookingActionResponse> {
    return this.authRequest<BookingActionResponse>("/web/client/bookings/proposal/accept", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async declineProposal(payload: { bookingId: string; decisionNote?: string }): Promise<BookingActionResponse> {
    return this.authRequest<BookingActionResponse>("/web/client/bookings/proposal/decline", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  private async authRequest<T>(path: string, options: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.requireToken()}`,
        ...(options.headers ?? {}),
      },
    });
  }

  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(this.normalizeError(body, response.status));
    }

    return (await response.json()) as T;
  }

  private requireToken(): string {
    if (!this.token) {
      throw new Error("Нет активной web-сессии");
    }

    return this.token;
  }

  private normalizeError(body: string, status: number): string {
    try {
      const parsed = JSON.parse(body) as { message?: string };
      return parsed.message || `API ответил со статусом ${status}`;
    } catch {
      return body || `API ответил со статусом ${status}`;
    }
  }
}
