import { Module } from "@nestjs/common";

import { BookingsModule } from "../bookings/bookings.module";
import { ClientsModule } from "../clients/clients.module";
import { MiniAppModule } from "../mini-app/mini-app.module";
import { SlotsModule } from "../slots/slots.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { WebBookingController } from "./web-booking.controller";
import { WebBookingService } from "./web-booking.service";

@Module({
  imports: [PrismaModule, ClientsModule, SlotsModule, BookingsModule, MiniAppModule],
  controllers: [WebBookingController],
  providers: [WebBookingService],
})
export class WebBookingModule {}
