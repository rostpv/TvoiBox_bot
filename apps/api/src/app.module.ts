import { Module } from "@nestjs/common";

import { AppConfigService } from "./config/app-config.service";
import { HealthModule } from "./modules/health/health.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [PrismaModule, HealthModule],
  providers: [AppConfigService],
})
export class AppModule {}
