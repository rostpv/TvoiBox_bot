import { BadRequestException, Body, Controller, Get, Header, Headers, Post, Query, Res } from "@nestjs/common";

import { WebBookingService } from "./web-booking.service";

interface CreateSessionBody {
  fullName?: string;
  phone?: string;
  email?: string | null;
}

interface CreateTrainerSessionBody {
  secret?: string;
}

interface UpdateProfileBody extends CreateSessionBody {}

interface RequestBookingBody {
  slotId?: string;
  clientComment?: string | null;
}

interface ClientTrainingsQuery {
  includeArchived?: string;
}

interface ClientCalendarQuery {
  bookingId?: string;
  accessToken?: string;
}

interface PassthroughResponse {
  setHeader(name: string, value: string): void;
}

@Controller("web")
export class WebBookingController {
  constructor(private readonly webBookingService: WebBookingService) {}

  @Post("client/session")
  async createClientSession(@Body() body: CreateSessionBody) {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Invalid request body");
    }

    const result = await this.webBookingService.createClientSession({
      fullName: body.fullName ?? "",
      phone: body.phone ?? "",
      email: body.email ?? null,
    });

    return {
      status: "ok",
      token: result.token,
      profile: result.client,
    };
  }

  @Post("trainer/session")
  async createTrainerSession(@Body() body: CreateTrainerSessionBody) {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Invalid request body");
    }

    return this.webBookingService.createTrainerSession({
      secret: body.secret ?? "",
    });
  }

  @Get("client/me")
  async me(@Headers("authorization") authorization?: string) {
    return {
      status: "ok",
      profile: await this.webBookingService.getClientByToken(this.extractBearerToken(authorization)),
    };
  }

  @Post("client/me")
  async updateProfile(@Headers("authorization") authorization: string | undefined, @Body() body: UpdateProfileBody) {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Invalid request body");
    }

    return {
      status: "updated",
      profile: await this.webBookingService.updateClientProfile(this.extractBearerToken(authorization), {
        fullName: body.fullName ?? "",
        phone: body.phone ?? "",
        email: body.email ?? null,
      }),
    };
  }

  @Get("client/slots")
  async getClientSlots(@Headers("authorization") authorization?: string) {
    return this.webBookingService.getAvailableSlots(this.extractBearerToken(authorization));
  }

  @Post("client/bookings/request")
  async requestBooking(@Headers("authorization") authorization: string | undefined, @Body() body: RequestBookingBody) {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Invalid request body");
    }

    return this.webBookingService.requestBooking(this.extractBearerToken(authorization), {
      slotId: body.slotId ?? "",
      clientComment: body.clientComment ?? null,
    });
  }

  @Get("client/trainings")
  async getClientTrainings(@Headers("authorization") authorization: string | undefined, @Query() query: ClientTrainingsQuery) {
    return this.webBookingService.getClientTrainings(this.extractBearerToken(authorization), {
      includeArchived: query.includeArchived === "true",
    });
  }

  @Get("client/trainings/calendar")
  @Header("Content-Type", "text/calendar; charset=utf-8")
  async downloadClientTrainingCalendar(
    @Query() query: ClientCalendarQuery,
    @Res({ passthrough: true }) response: PassthroughResponse,
  ) {
    if (!query || typeof query !== "object") {
      throw new BadRequestException("Invalid query");
    }

    const file = await this.webBookingService.getClientTrainingCalendarFile(
      query.accessToken ?? "",
      query.bookingId ?? "",
    );

    response.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    return file.content;
  }

  private extractBearerToken(authorization?: string): string {
    const [scheme, token] = authorization?.split(" ") ?? [];
    if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
      return "";
    }

    return token.trim();
  }
}
