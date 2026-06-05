import { BadRequestException, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { BookingStatus, Prisma, SlotStatus, TrainingStatus } from "@prisma/client";

import { AppConfigService } from "../../config/app-config.service";
import { PrismaService } from "../../prisma/prisma.service";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const SLOT_DURATION_MS = HOUR_MS;
const DAY_MS = 24 * HOUR_MS;
const MOSCOW_TIME_ZONE = "Europe/Moscow";
export const VIRTUAL_SLOT_PREFIX = "virtual";
const DEFAULT_TRAINING_DURATION_MINUTES = 60;
const DEFAULT_WORKDAY_START_MINUTE = 8 * 60;
const DEFAULT_WORKDAY_END_MINUTE = 22 * 60;

export interface OpenSlotsInput {
  trainerTelegramId: string;
  startAt: string;
  endAt?: string;
  scheduledOnly?: boolean;
}

export interface CloseSlotsInput {
  trainerTelegramId: string;
  slotId?: string;
  startAt?: string;
  endAt?: string;
  reason?: string | null;
  scheduledOnly?: boolean;
}

export interface GetAvailableSlotsInput {
  telegramId: string;
  from?: string;
  to?: string;
}

export interface GetAvailableSlotsForClientInput {
  clientId: string;
  from?: string;
  to?: string;
}

export interface GetTrainerSlotsInput {
  trainerTelegramId: string;
  from: string;
  to: string;
}

export interface SlotDto {
  id: string;
  startAt: string;
  endAt: string;
  status: SlotStatus;
}

export interface SlotClosureInfoDto {
  hasClosure: boolean;
  reason: string | null;
  closedFrom: string | null;
  closedUntil: string | null;
  closedSlotsCount: number;
}

export interface OpenSlotsResult {
  created: number;
  reopened: number;
  alreadyOpen: number;
  skippedBooked: number;
  slots: SlotDto[];
}

export interface CloseSlotsResult {
  closed: number;
  skippedBooked: number;
  notFound: number;
}

export interface ReopenSlotsResult {
  reopened: number;
}

export interface ClosedPeriodDto {
  startAt: string;
  endAt: string;
  reason: string;
  closedSlotsCount: number;
}

const moscowDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: MOSCOW_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const moscowWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MOSCOW_TIME_ZONE,
  weekday: "long",
});

@Injectable()
export class SlotsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly appConfigService: AppConfigService,
  ) {}

  async openSlots(input: OpenSlotsInput): Promise<OpenSlotsResult> {
    this.ensureTrainerAccess(input.trainerTelegramId);

    const settings = await this.ensureTrainerSettings();
    const startAt = this.parseIsoDate("startAt", input.startAt);
    const slotDurationMs = this.getSlotDurationMs(settings);
    const endAt = input.endAt ? this.parseIsoDate("endAt", input.endAt) : new Date(startAt.getTime() + slotDurationMs);
    const ranges = input.scheduledOnly
      ? this.buildScheduledSlotRanges(startAt, endAt, settings)
      : this.buildSlotRanges(startAt, endAt, slotDurationMs);

    let created = 0;
    let reopened = 0;
    let alreadyOpen = 0;
    let skippedBooked = 0;
    const slots: SlotDto[] = [];

    await this.prismaService.$transaction(async (transaction) => {
      for (const range of ranges) {
        const existing = await transaction.slot.findUnique({
          where: {
            startAt_endAt: {
              startAt: range.startAt,
              endAt: range.endAt,
            },
          },
        });

        if (!existing) {
          const createdSlot = await transaction.slot.create({
            data: {
              startAt: range.startAt,
              endAt: range.endAt,
              status: SlotStatus.OPEN,
            },
          });
          created += 1;
          slots.push(this.toSlotDto(createdSlot));
          continue;
        }

        if (existing.status === SlotStatus.BOOKED) {
          const hasActiveOccupation = await this.hasActiveOccupation(transaction, existing.id);
          if (hasActiveOccupation) {
            skippedBooked += 1;
            continue;
          }
        }

        if (existing.status === SlotStatus.OPEN) {
          alreadyOpen += 1;
          slots.push(this.toSlotDto(existing));
          continue;
        }

        const reopenedSlot = await transaction.slot.update({
          where: { id: existing.id },
          data: {
            status: SlotStatus.OPEN,
            isManuallyClosed: false,
            closureReason: null,
            heldUntil: null,
          },
        });
        reopened += 1;
        slots.push(this.toSlotDto(reopenedSlot));
      }
    });

    return {
      created,
      reopened,
      alreadyOpen,
      skippedBooked,
      slots,
    };
  }

  async closeSlots(input: CloseSlotsInput): Promise<CloseSlotsResult> {
    this.ensureTrainerAccess(input.trainerTelegramId);

    const reason = input.reason?.trim() || null;

    if (input.slotId) {
      const slotId = input.slotId.trim();
      if (!slotId) {
        throw new BadRequestException("slotId must not be empty");
      }

      const existing = await this.prismaService.slot.findUnique({
        where: { id: slotId },
      });

      if (!existing) {
        return {
          closed: 0,
          skippedBooked: 0,
          notFound: 1,
        };
      }

      if (existing.status === SlotStatus.BOOKED) {
        throw new ConflictException("Cannot close booked slot");
      }

      if (existing.status === SlotStatus.CLOSED && existing.isManuallyClosed) {
        return {
          closed: 0,
          skippedBooked: 0,
          notFound: 0,
        };
      }

      await this.prismaService.slot.update({
        where: { id: existing.id },
        data: {
          status: SlotStatus.CLOSED,
          isManuallyClosed: true,
          closureReason: reason,
          heldUntil: null,
        },
      });

      return {
        closed: 1,
        skippedBooked: 0,
        notFound: 0,
      };
    }

    if (!input.startAt || !input.endAt) {
      throw new BadRequestException("Provide either slotId or both startAt and endAt");
    }

    let startAt = this.parseIsoDate("startAt", input.startAt);
    let endAt = this.parseIsoDate("endAt", input.endAt);

    // Period closures from admin panel are date-based and must cover full Moscow days.
    if (reason) {
      const normalizedStartAt = this.getMoscowStartOfDay(startAt);
      const normalizedEndAt = this.toMoscowDayExclusiveEnd(endAt);
      startAt = normalizedStartAt;
      endAt = normalizedEndAt;
    }

    this.assertQuarterHourBoundary("startAt", startAt);
    this.assertQuarterHourBoundary("endAt", endAt);

    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException("endAt must be greater than startAt");
    }

    const settings = await this.ensureTrainerSettings();
    const ranges = input.scheduledOnly
      ? this.buildScheduledSlotRanges(startAt, endAt, settings)
      : this.buildSlotRanges(startAt, endAt, this.getSlotDurationMs(settings));
    let closed = 0;
    let skippedBooked = 0;

    await this.prismaService.$transaction(async (transaction) => {
      for (const range of ranges) {
        const existing = await transaction.slot.findUnique({
          where: {
            startAt_endAt: {
              startAt: range.startAt,
              endAt: range.endAt,
            },
          },
        });

        if (!existing) {
          await transaction.slot.create({
            data: {
              startAt: range.startAt,
              endAt: range.endAt,
              status: SlotStatus.CLOSED,
              isManuallyClosed: true,
              closureReason: reason,
              heldUntil: null,
            },
          });
          closed += 1;
          continue;
        }

        if (existing.status === SlotStatus.BOOKED) {
          skippedBooked += 1;
          continue;
        }

        if (existing.status === SlotStatus.CLOSED && existing.isManuallyClosed) {
          continue;
        }

        await transaction.slot.update({
          where: { id: existing.id },
          data: {
            status: SlotStatus.CLOSED,
            isManuallyClosed: true,
            closureReason: reason,
            heldUntil: null,
          },
        });
        closed += 1;
      }
    });

    return {
      closed,
      skippedBooked,
      notFound: 0,
    };
  }

  async reopenSlots(input: OpenSlotsInput): Promise<ReopenSlotsResult> {
    this.ensureTrainerAccess(input.trainerTelegramId);

    const settings = await this.ensureTrainerSettings();
    const startAt = this.parseIsoDate("startAt", input.startAt);
    const slotDurationMs = this.getSlotDurationMs(settings);
    const endAt = input.endAt ? this.parseIsoDate("endAt", input.endAt) : new Date(startAt.getTime() + slotDurationMs);
    this.assertQuarterHourBoundary("startAt", startAt);
    this.assertQuarterHourBoundary("endAt", endAt);
    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException("endAt must be greater than startAt");
    }
    if (!input.scheduledOnly) {
      const result = await this.prismaService.slot.updateMany({
        where: {
          startAt: {
            gte: startAt,
            lt: endAt,
          },
          status: SlotStatus.CLOSED,
          isManuallyClosed: true,
        },
        data: {
          status: SlotStatus.OPEN,
          isManuallyClosed: false,
          closureReason: null,
          heldUntil: null,
        },
      });

      return {
        reopened: result.count,
      };
    }

    const ranges = this.buildScheduledSlotRanges(startAt, endAt, settings);
    let reopened = 0;

    await this.prismaService.$transaction(async (transaction) => {
      for (const range of ranges) {
        const result = await transaction.slot.updateMany({
          where: {
            startAt: range.startAt,
            endAt: range.endAt,
            status: SlotStatus.CLOSED,
            isManuallyClosed: true,
          },
          data: {
            status: SlotStatus.OPEN,
            isManuallyClosed: false,
            closureReason: null,
            heldUntil: null,
          },
        });
        reopened += result.count;
      }
    });

    return { reopened };
  }

  private async hasActiveOccupation(transaction: Prisma.TransactionClient, slotId: string): Promise<boolean> {
    const [activeBooking, activeTraining] = await Promise.all([
      transaction.booking.findFirst({
        where: {
          slotId,
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED],
          },
        },
        select: { id: true },
      }),
      transaction.training.findFirst({
        where: {
          slotId,
          status: {
            in: [TrainingStatus.SCHEDULED, TrainingStatus.RESCHEDULED],
          },
        },
        select: { id: true },
      }),
    ]);

    return Boolean(activeBooking || activeTraining);
  }

  async getAvailableSlots(input: GetAvailableSlotsInput): Promise<SlotDto[]> {
    const telegramId = input.telegramId.trim();
    if (!telegramId) {
      throw new BadRequestException("telegramId is required");
    }

    const client = await this.prismaService.client.findUnique({
      where: { telegramId },
    });

    if (!client) {
      throw new BadRequestException("Client is not registered");
    }

    return this.getAvailableSlotsForClient({
      clientId: client.id,
      from: input.from,
      to: input.to,
    });
  }

  async getAvailableSlotsForClient(input: GetAvailableSlotsForClientInput): Promise<SlotDto[]> {
    const clientId = input.clientId.trim();
    if (!clientId) {
      throw new BadRequestException("clientId is required");
    }

    const client = await this.prismaService.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new BadRequestException("Client is not registered");
    }

    if (client.isBlacklisted) {
      throw new ForbiddenException("Client is blacklisted");
    }

    const now = new Date();
    const settings = await this.ensureTrainerSettings();

    const defaultFrom = now;
    const defaultTo = this.getBookingHorizonExclusiveEnd(now, settings.bookingHorizonDays);

    const requestedFrom = input.from ? this.parseIsoDate("from", input.from) : defaultFrom;
    const requestedTo = input.to ? this.parseIsoDate("to", input.to) : defaultTo;

    if (requestedTo.getTime() <= requestedFrom.getTime()) {
      throw new BadRequestException("to must be greater than from");
    }

    const from = new Date(Math.max(requestedFrom.getTime(), defaultFrom.getTime()));
    const to = new Date(Math.min(requestedTo.getTime(), defaultTo.getTime()));

    if (to.getTime() <= from.getTime()) {
      return [];
    }

    const slotRanges = this.buildScheduledSlotRanges(from, to, settings);
    if (slotRanges.length === 0) {
      return [];
    }

    const explicitSlots = await this.prismaService.slot.findMany({
      where: {
        startAt: {
          gte: slotRanges[0].startAt,
          lt: to,
        },
      },
      orderBy: {
        startAt: "asc",
      },
    });

    const explicitSlotsByKey = new Map<string, (typeof explicitSlots)[number]>();
    for (const slot of explicitSlots) {
      explicitSlotsByKey.set(this.getSlotKey(slot.startAt, slot.endAt), slot);
    }

    const cutoffMs = settings.sameDayBookingCutoff * 60 * 60 * 1000;
    const cutoffMoment = new Date(now.getTime() + cutoffMs);
    const nowMoscowDateKey = this.getMoscowDateKey(now);

    const available: SlotDto[] = [];
    for (const range of slotRanges) {
      const startAt = range.startAt;
      const endAt = range.endAt;
      const key = this.getSlotKey(startAt, endAt);
      const explicit = explicitSlotsByKey.get(key);

      if (startAt.getTime() < now.getTime()) {
        continue;
      }

      if (settings.sameDayBookingCutoff <= 0) {
        // no-op
      } else {
        const slotMoscowDateKey = this.getMoscowDateKey(startAt);
        if (slotMoscowDateKey === nowMoscowDateKey && startAt.getTime() < cutoffMoment.getTime()) {
          continue;
        }
      }

      if (!explicit) {
        continue;
      }

      if (explicit.status === SlotStatus.CLOSED || explicit.status === SlotStatus.HELD || explicit.status === SlotStatus.BOOKED) {
        continue;
      }

      if (explicit.status === SlotStatus.OPEN) {
        available.push(this.toSlotDto(explicit));
        continue;
      }
    }

    return available;
  }

  async getTrainerSlots(input: GetTrainerSlotsInput): Promise<SlotDto[]> {
    this.ensureTrainerAccess(input.trainerTelegramId);

    const from = this.parseIsoDate("from", input.from);
    const to = this.parseIsoDate("to", input.to);

    this.assertQuarterHourBoundary("from", from);
    this.assertQuarterHourBoundary("to", to);
    if (to.getTime() <= from.getTime()) {
      throw new BadRequestException("to must be greater than from");
    }

    const maxRangeMs = 31 * 24 * SLOT_DURATION_MS;
    if (to.getTime() - from.getTime() > maxRangeMs) {
      throw new BadRequestException("Range is too large");
    }

    const settings = await this.ensureTrainerSettings();
    const explicitSlots = await this.prismaService.slot.findMany({
      where: {
        startAt: {
          gte: from,
          lt: to,
        },
      },
      orderBy: {
        startAt: "asc",
      },
    });

    const explicitSlotsByKey = new Map<string, (typeof explicitSlots)[number]>();
    for (const slot of explicitSlots) {
      explicitSlotsByKey.set(this.getSlotKey(slot.startAt, slot.endAt), slot);
    }

    const result: SlotDto[] = [];
    for (const range of this.buildScheduledSlotRanges(from, to, settings)) {
      const startAt = range.startAt;
      const endAt = range.endAt;
      const key = this.getSlotKey(startAt, endAt);
      const explicit = explicitSlotsByKey.get(key);

      if (explicit) {
        result.push({
          id: explicit.id,
          startAt: explicit.startAt.toISOString(),
          endAt: explicit.endAt.toISOString(),
          status: explicit.status,
        });
        continue;
      }

      result.push({
        id: this.toVirtualSlotId(startAt, endAt),
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        status: SlotStatus.CLOSED,
      });
    }

    return result;
  }

  async getClientClosureInfo(input: GetAvailableSlotsInput): Promise<SlotClosureInfoDto> {
    const telegramId = input.telegramId.trim();
    if (!telegramId) {
      throw new BadRequestException("telegramId is required");
    }

    const client = await this.prismaService.client.findUnique({
      where: { telegramId },
    });
    if (!client) {
      throw new BadRequestException("Client is not registered");
    }

    const now = new Date();
    const settings = await this.ensureTrainerSettings();
    const defaultTo = this.getBookingHorizonExclusiveEnd(now, settings.bookingHorizonDays);
    const from = this.roundUpToNextQuarterHour(now);
    const to = defaultTo;

    if (to.getTime() <= from.getTime()) {
      return {
        hasClosure: false,
        reason: null,
        closedFrom: null,
        closedUntil: null,
        closedSlotsCount: 0,
      };
    }

    const manualClosedSlots = await this.prismaService.slot.findMany({
      where: {
        isManuallyClosed: true,
        status: SlotStatus.CLOSED,
        closureReason: {
          not: null,
        },
        startAt: {
          gte: from,
          lt: to,
        },
      },
      orderBy: {
        startAt: "asc",
      },
    });

    if (manualClosedSlots.length === 0) {
      return {
        hasClosure: false,
        reason: null,
        closedFrom: null,
        closedUntil: null,
        closedSlotsCount: 0,
      };
    }

    const latestByUpdatedAt = [...manualClosedSlots].sort(
      (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
    )[0];
    const reason = latestByUpdatedAt.closureReason?.trim() || null;
    const closedFrom = manualClosedSlots[0].startAt.toISOString();
    const closedUntil = manualClosedSlots[manualClosedSlots.length - 1].endAt.toISOString();

    return {
      hasClosure: Boolean(reason),
      reason,
      closedFrom,
      closedUntil,
      closedSlotsCount: manualClosedSlots.length,
    };
  }

  async listClosedPeriods(trainerTelegramId: string): Promise<ClosedPeriodDto[]> {
    this.ensureTrainerAccess(trainerTelegramId);

    const now = new Date();
    const settings = await this.ensureTrainerSettings();
    const from = this.roundUpToNextQuarterHour(now);
    const to = this.getBookingHorizonExclusiveEnd(now, settings.bookingHorizonDays);

    const closedSlots = await this.prismaService.slot.findMany({
      where: {
        isManuallyClosed: true,
        status: SlotStatus.CLOSED,
        closureReason: {
          not: null,
        },
        startAt: {
          gte: from,
          lt: to,
        },
      },
      orderBy: {
        startAt: "asc",
      },
    });

    if (closedSlots.length === 0) {
      return [];
    }

    const periods: Array<{
      startAt: Date;
      endAt: Date;
      reason: string;
      closedSlotsCount: number;
    }> = [];

    for (const slot of closedSlots) {
      const reason = slot.closureReason?.trim() || "без причины";
      const last = periods[periods.length - 1];
      if (
        last
        && last.endAt.getTime() === slot.startAt.getTime()
        && last.reason === reason
      ) {
        last.endAt = slot.endAt;
        last.closedSlotsCount += 1;
        continue;
      }

      periods.push({
        startAt: slot.startAt,
        endAt: slot.endAt,
        reason,
        closedSlotsCount: 1,
      });
    }

    return periods.map((period) => ({
      startAt: period.startAt.toISOString(),
      endAt: period.endAt.toISOString(),
      reason: period.reason,
      closedSlotsCount: period.closedSlotsCount,
    }));
  }

  private ensureTrainerAccess(trainerTelegramId: string): void {
    const actorId = trainerTelegramId.trim();
    const allowed = new Set([
      this.appConfigService.values.trainerTelegramId,
      this.appConfigService.values.adminTelegramId,
    ]);

    if (!allowed.has(actorId)) {
      throw new ForbiddenException("Only trainer/admin can manage slots");
    }
  }

  private parseIsoDate(fieldName: string, rawValue: string): Date {
    const value = rawValue.trim();
    if (!value) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid ISO date`);
    }

    return date;
  }

  private buildSlotRanges(startAt: Date, endAt: Date, slotDurationMs: number): Array<{ startAt: Date; endAt: Date }> {
    this.assertQuarterHourBoundary("startAt", startAt);
    this.assertQuarterHourBoundary("endAt", endAt);

    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException("endAt must be greater than startAt");
    }

    const result: Array<{ startAt: Date; endAt: Date }> = [];
    let cursor = startAt.getTime();

    while (cursor + slotDurationMs <= endAt.getTime()) {
      result.push({
        startAt: new Date(cursor),
        endAt: new Date(cursor + slotDurationMs),
      });
      cursor += slotDurationMs;
    }

    if (result.length === 0) {
      throw new BadRequestException("Range must fit at least one training slot");
    }

    return result;
  }

  private assertQuarterHourBoundary(fieldName: string, date: Date): void {
    if (
      date.getUTCMinutes() % 15 !== 0 ||
      date.getUTCSeconds() !== 0 ||
      date.getUTCMilliseconds() !== 0
    ) {
      throw new BadRequestException(`${fieldName} must be on 15-minute boundary`);
    }
  }

  private async ensureTrainerSettings() {
    const existing = await this.prismaService.trainerSettings.findFirst();
    if (existing) {
      return existing;
    }

    return this.prismaService.trainerSettings.create({
      data: {
        bookingHorizonDays: 14,
        sameDayBookingCutoff: 0,
        workingDays: ["monday", "wednesday", "friday"],
        workdayStartHour: 8,
        workdayEndHour: 22,
        trainingDurationMinutes: DEFAULT_TRAINING_DURATION_MINUTES,
        workdayStartMinute: DEFAULT_WORKDAY_START_MINUTE,
        workdayEndMinute: DEFAULT_WORKDAY_END_MINUTE,
      },
    });
  }

  private buildScheduledSlotRanges(
    from: Date,
    to: Date,
    settings: {
      workingDays: string[];
      workdayStartHour: number;
      workdayEndHour: number;
      trainingDurationMinutes?: number;
      workdayStartMinute?: number;
      workdayEndMinute?: number;
    },
  ): Array<{ startAt: Date; endAt: Date }> {
    const ranges: Array<{ startAt: Date; endAt: Date }> = [];
    const slotDurationMs = this.getSlotDurationMs(settings);
    const startMinute = this.getWorkdayStartMinute(settings);
    const endMinute = this.getWorkdayEndMinute(settings);

    let dayStart = this.getMoscowStartOfDay(from);
    if (dayStart.getTime() + DAY_MS <= from.getTime()) {
      dayStart = new Date(dayStart.getTime() + DAY_MS);
    }

    while (dayStart.getTime() < to.getTime()) {
      const weekday = moscowWeekdayFormatter.format(dayStart).toLowerCase();
      if (settings.workingDays.includes(weekday)) {
        const workdayStart = new Date(dayStart.getTime() + startMinute * MINUTE_MS);
        const workdayEnd = new Date(dayStart.getTime() + endMinute * MINUTE_MS);

        for (
          let cursor = workdayStart.getTime();
          cursor + slotDurationMs <= workdayEnd.getTime();
          cursor += slotDurationMs
        ) {
          const startAt = new Date(cursor);
          const endAt = new Date(cursor + slotDurationMs);
          if (endAt.getTime() <= from.getTime() || startAt.getTime() >= to.getTime()) {
            continue;
          }

          ranges.push({ startAt, endAt });
        }
      }

      dayStart = new Date(dayStart.getTime() + DAY_MS);
    }

    return ranges;
  }

  private getMoscowDateKey(date: Date): string {
    const parts = moscowDateFormatter.formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (!year || !month || !day) {
      return "";
    }

    return `${year}-${month}-${day}`;
  }

  private roundUpToNextQuarterHour(date: Date): Date {
    const rounded = new Date(date);
    const minutes = rounded.getUTCMinutes();
    rounded.setUTCMinutes(Math.ceil(minutes / 15) * 15, 0, 0);
    if (rounded.getTime() < date.getTime()) {
      rounded.setUTCMinutes(rounded.getUTCMinutes() + 15, 0, 0);
    }

    return rounded;
  }

  private getSlotDurationMs(settings: { trainingDurationMinutes?: number }): number {
    const minutes = settings.trainingDurationMinutes ?? DEFAULT_TRAINING_DURATION_MINUTES;
    return minutes * MINUTE_MS;
  }

  private getWorkdayStartMinute(settings: { workdayStartHour: number; workdayStartMinute?: number }): number {
    if (
      typeof settings.workdayStartMinute === "number"
      && !(settings.workdayStartMinute === DEFAULT_WORKDAY_START_MINUTE && settings.workdayStartHour !== 8)
    ) {
      return settings.workdayStartMinute;
    }

    return settings.workdayStartHour * 60;
  }

  private getWorkdayEndMinute(settings: { workdayEndHour: number; workdayEndMinute?: number }): number {
    if (
      typeof settings.workdayEndMinute === "number"
      && !(settings.workdayEndMinute === DEFAULT_WORKDAY_END_MINUTE && settings.workdayEndHour !== 22)
    ) {
      return settings.workdayEndMinute;
    }

    return settings.workdayEndHour * 60;
  }

  private getBookingHorizonExclusiveEnd(now: Date, bookingHorizonDays: number): Date {
    const safeDays = Number.isFinite(bookingHorizonDays) && bookingHorizonDays > 0
      ? Math.trunc(bookingHorizonDays)
      : 14;

    return new Date(this.getMoscowStartOfDay(now).getTime() + (safeDays + 1) * DAY_MS);
  }

  private getSlotKey(startAt: Date, endAt: Date): string {
    return `${startAt.toISOString()}|${endAt.toISOString()}`;
  }

  private toVirtualSlotId(startAt: Date, endAt: Date): string {
    return `${VIRTUAL_SLOT_PREFIX}|${startAt.getTime()}|${endAt.getTime()}`;
  }

  private toSlotDto(slot: {
    id: string;
    startAt: Date;
    endAt: Date;
    status: SlotStatus;
  }): SlotDto {
    return {
      id: slot.id,
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
      status: slot.status,
    };
  }

  private getMoscowStartOfDay(date: Date): Date {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: MOSCOW_TIME_ZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(date);

    const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");
    const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
    const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");

    return new Date(Date.UTC(year, month - 1, day, -3, 0, 0, 0));
  }

  private toMoscowDayExclusiveEnd(date: Date): Date {
    const startOfDay = this.getMoscowStartOfDay(date);
    if (startOfDay.getTime() === date.getTime()) {
      return startOfDay;
    }

    return new Date(startOfDay.getTime() + DAY_MS);
  }
}
