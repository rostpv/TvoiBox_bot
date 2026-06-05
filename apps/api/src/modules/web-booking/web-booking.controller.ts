import { BadRequestException, Body, Controller, Get, Header, Headers, Post, Query, Res } from "@nestjs/common";

import { WebBookingService } from "./web-booking.service";

interface CreateSessionBody {
  fullName?: string;
  phone?: string;
  email?: string | null;
  consentAccepted?: boolean;
}

interface CreateTrainerSessionBody {
  secret?: string;
}

interface UpdateProfileBody extends CreateSessionBody {}

interface RequestBookingBody {
  slotId?: string;
  clientComment?: string | null;
}

interface CreateNoSlotRequestBody {
  preferredDays?: string[];
  preferredTime?: string | null;
  clientComment?: string | null;
}

interface ClientTrainingActionBody {
  bookingId?: string;
  clientComment?: string;
}

interface ClientNoSlotRequestActionBody {
  requestId?: string;
}

interface ClientRescheduleBody extends ClientTrainingActionBody {
  targetSlotId?: string;
}

interface ClientProposalDecisionBody {
  bookingId?: string;
  decisionNote?: string;
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
      consentAccepted: body.consentAccepted,
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
        consentAccepted: body.consentAccepted,
      }),
    };
  }

  @Get("client/slots")
  async getClientSlots(@Headers("authorization") authorization?: string) {
    return this.webBookingService.getAvailableSlots(this.extractBearerToken(authorization));
  }

  @Get("client/closure-info")
  async getClientClosureInfo(@Headers("authorization") authorization?: string) {
    return this.webBookingService.getClientClosureInfo(this.extractBearerToken(authorization));
  }

  @Get("client/booking-rules")
  async getClientBookingRules() {
    return this.webBookingService.getClientBookingRules();
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

  @Post("client/trainings/cancel")
  async cancelClientTraining(@Headers("authorization") authorization: string | undefined, @Body() body: ClientTrainingActionBody) {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Invalid request body");
    }

    return this.webBookingService.cancelClientTraining(this.extractBearerToken(authorization), {
      bookingId: body.bookingId ?? "",
      clientComment: body.clientComment,
    });
  }

  @Post("client/trainings/reschedule")
  async rescheduleClientTraining(@Headers("authorization") authorization: string | undefined, @Body() body: ClientRescheduleBody) {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Invalid request body");
    }

    return this.webBookingService.rescheduleClientTraining(this.extractBearerToken(authorization), {
      bookingId: body.bookingId ?? "",
      targetSlotId: body.targetSlotId ?? "",
      clientComment: body.clientComment,
    });
  }

  @Post("client/trainings/archive")
  async archiveClientTraining(@Headers("authorization") authorization: string | undefined, @Body() body: ClientTrainingActionBody) {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Invalid request body");
    }

    return this.webBookingService.archiveClientTraining(this.extractBearerToken(authorization), {
      bookingId: body.bookingId ?? "",
    });
  }

  @Post("client/bookings/proposal/accept")
  async acceptProposal(@Headers("authorization") authorization: string | undefined, @Body() body: ClientProposalDecisionBody) {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Invalid request body");
    }

    return this.webBookingService.acceptProposedBookingTime(this.extractBearerToken(authorization), {
      bookingId: body.bookingId ?? "",
      decisionNote: body.decisionNote,
    });
  }

  @Post("client/bookings/proposal/decline")
  async declineProposal(@Headers("authorization") authorization: string | undefined, @Body() body: ClientProposalDecisionBody) {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Invalid request body");
    }

    return this.webBookingService.declineProposedBookingTime(this.extractBearerToken(authorization), {
      bookingId: body.bookingId ?? "",
      decisionNote: body.decisionNote,
    });
  }

  @Post("client/no-slot-requests")
  async createNoSlotRequest(@Headers("authorization") authorization: string | undefined, @Body() body: CreateNoSlotRequestBody) {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Invalid request body");
    }

    return this.webBookingService.createNoSlotRequest(this.extractBearerToken(authorization), {
      preferredDays: body.preferredDays ?? [],
      preferredTime: body.preferredTime ?? null,
      clientComment: body.clientComment ?? null,
    });
  }

  @Get("client/no-slot-requests")
  async getClientNoSlotRequests(@Headers("authorization") authorization: string | undefined) {
    return this.webBookingService.getClientNoSlotRequests(this.extractBearerToken(authorization));
  }

  @Post("client/no-slot-requests/archive")
  async archiveClientNoSlotRequest(@Headers("authorization") authorization: string | undefined, @Body() body: ClientNoSlotRequestActionBody) {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Invalid request body");
    }

    return this.webBookingService.archiveClientNoSlotRequest(this.extractBearerToken(authorization), {
      requestId: body.requestId ?? "",
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
