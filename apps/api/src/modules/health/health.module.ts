import { Module } from "@nestjs/common";

import { AppConfigService } from "../../config/app-config.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { DatabaseHealthService } from "./database-health.service";
import { DatabaseSeedService } from "./database-seed.service";
import { HealthController } from "./health.controller";

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [AppConfigService, DatabaseHealthService, DatabaseSeedService],
})
export class HealthModule {}
