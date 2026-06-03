import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";

import { AppConfigService } from "../../config/app-config.service";
import { PrismaService } from "../../prisma/prisma.service";

export interface TrainerSettingsDto {
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

export interface GetTrainerSettingsInput {
  trainerTelegramId: string;
}

export interface UpdateTrainerSettingsInput {
  trainerTelegramId: string;
  bookingHorizonDays?: number;
  sameDayBookingCutoff?: number;
  workingDays?: string[];
  workdayStartHour?: number;
  workdayEndHour?: number;
  trainingDurationMinutes?: number;
  workdayStartMinute?: number;
  workdayEndMinute?: number;
}

const MIN_BOOKING_HORIZON_DAYS = 1;
const MAX_BOOKING_HORIZON_DAYS = 60;
const MIN_SAME_DAY_CUTOFF_HOURS = 0;
const MAX_SAME_DAY_CUTOFF_HOURS = 23;
const MIN_WORKDAY_HOUR = 0;
const MAX_WORKDAY_START_HOUR = 23;
const MAX_WORKDAY_END_HOUR = 24;
const MINUTE_STEP = 15;
const MIN_WORKDAY_MINUTE = 0;
const MAX_WORKDAY_START_MINUTE = 23 * 60 + 45;
const MAX_WORKDAY_END_MINUTE = 24 * 60;
const DEFAULT_TRAINING_DURATION_MINUTES = 60;
const DEFAULT_WORKDAY_START_MINUTE = 8 * 60;
const DEFAULT_WORKDAY_END_MINUTE = 22 * 60;
const ALLOWED_TRAINING_DURATIONS = new Set([30, 45, 60, 75, 90, 105, 120]);
const DEFAULT_WORKING_DAYS = ["monday", "wednesday", "friday"];
const ALLOWED_WORKING_DAYS = new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);

@Injectable()
export class TrainerSettingsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly appConfigService: AppConfigService,
  ) {}

  async getCurrent(input: GetTrainerSettingsInput): Promise<TrainerSettingsDto> {
    this.ensureTrainerAccess(input.trainerTelegramId);
    const settings = await this.ensureTrainerSettings();
    return this.toDto(settings);
  }

  async getPublicSettings(): Promise<TrainerSettingsDto> {
    const settings = await this.ensureTrainerSettings();
    return this.toDto(settings);
  }

  async update(input: UpdateTrainerSettingsInput): Promise<TrainerSettingsDto> {
    this.ensureTrainerAccess(input.trainerTelegramId);

    const hasHorizon = typeof input.bookingHorizonDays !== "undefined";
    const hasCutoff = typeof input.sameDayBookingCutoff !== "undefined";
    const hasWorkingDays = typeof input.workingDays !== "undefined";
    const hasWorkdayStartHour = typeof input.workdayStartHour !== "undefined";
    const hasWorkdayEndHour = typeof input.workdayEndHour !== "undefined";
    const hasTrainingDuration = typeof input.trainingDurationMinutes !== "undefined";
    const hasWorkdayStartMinute = typeof input.workdayStartMinute !== "undefined";
    const hasWorkdayEndMinute = typeof input.workdayEndMinute !== "undefined";
    if (
      !hasHorizon
      && !hasCutoff
      && !hasWorkingDays
      && !hasWorkdayStartHour
      && !hasWorkdayEndHour
      && !hasTrainingDuration
      && !hasWorkdayStartMinute
      && !hasWorkdayEndMinute
    ) {
      throw new BadRequestException("At least one setting must be provided");
    }

    const nextHorizon = hasHorizon ? this.parseHorizonDays(input.bookingHorizonDays) : undefined;
    const nextCutoff = hasCutoff ? this.parseSameDayCutoff(input.sameDayBookingCutoff) : undefined;
    const nextWorkingDays = hasWorkingDays ? this.parseWorkingDays(input.workingDays) : undefined;
    const nextWorkdayStartHour = hasWorkdayStartHour ? this.parseWorkdayStartHour(input.workdayStartHour) : undefined;
    const nextWorkdayEndHour = hasWorkdayEndHour ? this.parseWorkdayEndHour(input.workdayEndHour) : undefined;
    const nextTrainingDuration = hasTrainingDuration
      ? this.parseTrainingDurationMinutes(input.trainingDurationMinutes)
      : undefined;
    const nextWorkdayStartMinute = hasWorkdayStartMinute
      ? this.parseWorkdayStartMinute(input.workdayStartMinute)
      : (typeof nextWorkdayStartHour === "number" ? nextWorkdayStartHour * 60 : undefined);
    const nextWorkdayEndMinute = hasWorkdayEndMinute
      ? this.parseWorkdayEndMinute(input.workdayEndMinute)
      : (typeof nextWorkdayEndHour === "number" ? nextWorkdayEndHour * 60 : undefined);
    const current = await this.ensureTrainerSettings();

    const currentStartMinute = this.resolveWorkdayStartMinute(current);
    const currentEndMinute = this.resolveWorkdayEndMinute(current);
    const effectiveStartMinute = typeof nextWorkdayStartMinute === "number"
      ? nextWorkdayStartMinute
      : currentStartMinute;
    const effectiveEndMinute = typeof nextWorkdayEndMinute === "number"
      ? nextWorkdayEndMinute
      : currentEndMinute;
    const effectiveDuration = typeof nextTrainingDuration === "number"
      ? nextTrainingDuration
      : (current.trainingDurationMinutes ?? DEFAULT_TRAINING_DURATION_MINUTES);
    if (effectiveEndMinute <= effectiveStartMinute) {
      throw new BadRequestException("workdayEndMinute must be greater than workdayStartMinute");
    }
    if (effectiveEndMinute - effectiveStartMinute < effectiveDuration) {
      throw new BadRequestException("Workday range must fit at least one training slot");
    }

    const updated = await this.prismaService.trainerSettings.update({
      where: { id: current.id },
      data: {
        bookingHorizonDays: nextHorizon,
        sameDayBookingCutoff: nextCutoff,
        workingDays: nextWorkingDays,
        workdayStartHour: typeof nextWorkdayStartMinute === "number"
          ? Math.floor(nextWorkdayStartMinute / 60)
          : nextWorkdayStartHour,
        workdayEndHour: typeof nextWorkdayEndMinute === "number"
          ? Math.ceil(nextWorkdayEndMinute / 60)
          : nextWorkdayEndHour,
        trainingDurationMinutes: nextTrainingDuration,
        workdayStartMinute: nextWorkdayStartMinute,
        workdayEndMinute: nextWorkdayEndMinute,
      },
    });

    return this.toDto(updated);
  }

  private parseHorizonDays(rawValue: number | undefined): number {
    if (typeof rawValue !== "number" || !Number.isInteger(rawValue)) {
      throw new BadRequestException("bookingHorizonDays must be an integer");
    }

    if (rawValue < MIN_BOOKING_HORIZON_DAYS || rawValue > MAX_BOOKING_HORIZON_DAYS) {
      throw new BadRequestException(
        `bookingHorizonDays must be between ${MIN_BOOKING_HORIZON_DAYS} and ${MAX_BOOKING_HORIZON_DAYS}`,
      );
    }

    return rawValue;
  }

  private parseSameDayCutoff(rawValue: number | undefined): number {
    if (typeof rawValue !== "number" || !Number.isInteger(rawValue)) {
      throw new BadRequestException("sameDayBookingCutoff must be an integer");
    }

    if (rawValue < MIN_SAME_DAY_CUTOFF_HOURS || rawValue > MAX_SAME_DAY_CUTOFF_HOURS) {
      throw new BadRequestException(
        `sameDayBookingCutoff must be between ${MIN_SAME_DAY_CUTOFF_HOURS} and ${MAX_SAME_DAY_CUTOFF_HOURS}`,
      );
    }

    return rawValue;
  }

  private parseWorkingDays(rawValue: string[] | undefined): string[] {
    if (!Array.isArray(rawValue)) {
      throw new BadRequestException("workingDays must be an array");
    }

    const normalized = rawValue
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean);
    const unique = [...new Set(normalized)];

    if (unique.length === 0) {
      throw new BadRequestException("At least one working day must be selected");
    }

    if (unique.some((item) => !ALLOWED_WORKING_DAYS.has(item))) {
      throw new BadRequestException("workingDays contains unsupported values");
    }

    return unique;
  }

  private parseWorkdayStartHour(rawValue: number | undefined): number {
    if (typeof rawValue !== "number" || !Number.isInteger(rawValue)) {
      throw new BadRequestException("workdayStartHour must be an integer");
    }

    if (rawValue < MIN_WORKDAY_HOUR || rawValue > MAX_WORKDAY_START_HOUR) {
      throw new BadRequestException(`workdayStartHour must be between ${MIN_WORKDAY_HOUR} and ${MAX_WORKDAY_START_HOUR}`);
    }

    return rawValue;
  }

  private parseWorkdayEndHour(rawValue: number | undefined): number {
    if (typeof rawValue !== "number" || !Number.isInteger(rawValue)) {
      throw new BadRequestException("workdayEndHour must be an integer");
    }

    if (rawValue < 1 || rawValue > MAX_WORKDAY_END_HOUR) {
      throw new BadRequestException(`workdayEndHour must be between 1 and ${MAX_WORKDAY_END_HOUR}`);
    }

    return rawValue;
  }

  private parseTrainingDurationMinutes(rawValue: number | undefined): number {
    if (typeof rawValue !== "number" || !Number.isInteger(rawValue)) {
      throw new BadRequestException("trainingDurationMinutes must be an integer");
    }

    if (!ALLOWED_TRAINING_DURATIONS.has(rawValue)) {
      throw new BadRequestException("trainingDurationMinutes has unsupported value");
    }

    return rawValue;
  }

  private parseWorkdayStartMinute(rawValue: number | undefined): number {
    if (typeof rawValue !== "number" || !Number.isInteger(rawValue)) {
      throw new BadRequestException("workdayStartMinute must be an integer");
    }

    if (rawValue < MIN_WORKDAY_MINUTE || rawValue > MAX_WORKDAY_START_MINUTE || rawValue % MINUTE_STEP !== 0) {
      throw new BadRequestException("workdayStartMinute must be a 15-minute value between 0 and 1425");
    }

    return rawValue;
  }

  private parseWorkdayEndMinute(rawValue: number | undefined): number {
    if (typeof rawValue !== "number" || !Number.isInteger(rawValue)) {
      throw new BadRequestException("workdayEndMinute must be an integer");
    }

    if (rawValue < MINUTE_STEP || rawValue > MAX_WORKDAY_END_MINUTE || rawValue % MINUTE_STEP !== 0) {
      throw new BadRequestException("workdayEndMinute must be a 15-minute value between 15 and 1440");
    }

    return rawValue;
  }

  private ensureTrainerAccess(trainerTelegramId: string): void {
    const actorId = trainerTelegramId.trim();
    const allowed = new Set([
      this.appConfigService.values.trainerTelegramId,
      this.appConfigService.values.adminTelegramId,
    ]);

    if (!allowed.has(actorId)) {
      throw new ForbiddenException("Only trainer/admin can manage settings");
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
        workingDays: DEFAULT_WORKING_DAYS,
        workdayStartHour: 8,
        workdayEndHour: 22,
        trainingDurationMinutes: DEFAULT_TRAINING_DURATION_MINUTES,
        workdayStartMinute: DEFAULT_WORKDAY_START_MINUTE,
        workdayEndMinute: DEFAULT_WORKDAY_END_MINUTE,
      },
    });
  }

  private toDto(settings: {
    bookingHorizonDays: number;
    sameDayBookingCutoff: number;
    workingDays: string[];
    workdayStartHour: number;
    workdayEndHour: number;
    trainingDurationMinutes?: number;
    workdayStartMinute?: number;
    workdayEndMinute?: number;
    updatedAt: Date;
  }): TrainerSettingsDto {
    const workdayStartMinute = this.resolveWorkdayStartMinute(settings);
    const workdayEndMinute = this.resolveWorkdayEndMinute(settings);
    return {
      bookingHorizonDays: settings.bookingHorizonDays,
      sameDayBookingCutoff: settings.sameDayBookingCutoff,
      workingDays: settings.workingDays,
      workdayStartHour: settings.workdayStartHour,
      workdayEndHour: settings.workdayEndHour,
      trainingDurationMinutes: settings.trainingDurationMinutes ?? DEFAULT_TRAINING_DURATION_MINUTES,
      workdayStartMinute,
      workdayEndMinute,
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  private resolveWorkdayStartMinute(settings: { workdayStartHour: number; workdayStartMinute?: number }): number {
    if (
      typeof settings.workdayStartMinute === "number"
      && !(settings.workdayStartMinute === DEFAULT_WORKDAY_START_MINUTE && settings.workdayStartHour !== 8)
    ) {
      return settings.workdayStartMinute;
    }

    return settings.workdayStartHour * 60;
  }

  private resolveWorkdayEndMinute(settings: { workdayEndHour: number; workdayEndMinute?: number }): number {
    if (
      typeof settings.workdayEndMinute === "number"
      && !(settings.workdayEndMinute === DEFAULT_WORKDAY_END_MINUTE && settings.workdayEndHour !== 22)
    ) {
      return settings.workdayEndMinute;
    }

    return settings.workdayEndHour * 60;
  }
}
