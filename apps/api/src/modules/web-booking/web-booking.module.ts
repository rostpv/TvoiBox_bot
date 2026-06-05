import { Module } from "@nestjs/common";

import { AppConfigService } from "../../config/app-config.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { BookingsModule } from "../bookings/bookings.module";
import { ClientsModule } from "../clients/clients.module";
import { MiniAppModule } from "../mini-app/mini-app.module";
import { NoSlotRequestsModule } from "../no-slot-requests/no-slot-requests.module";
import { SlotsModule } from "../slots/slots.module";
import { TrainerSettingsModule } from "../trainer-settings/trainer-settings.module";
import { WebBookingController } from "./web-booking.controller";
import { WebBookingService } from "./web-booking.service";

@Module({
  imports: [PrismaModule, ClientsModule, SlotsModule, BookingsModule, MiniAppModule, NoSlotRequestsModule, TrainerSettingsModule],
  controllers: [WebBookingController],
  providers: [WebBookingService, AppConfigService],
})
export class WebBookingModule {}
