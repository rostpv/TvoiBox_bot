import { Controller, Get } from "@nestjs/common";

import { AppConfigService } from "../../config/app-config.service";
import { DatabaseHealthService } from "./database-health.service";
import { DatabaseSeedService } from "./database-seed.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly databaseHealthService: DatabaseHealthService,
    private readonly databaseSeedService: DatabaseSeedService,
  ) {}

  @Get()
  async getHealth() {
    const config = this.appConfigService.values;
    const database = await this.databaseHealthService.ping();

    return {
      status: "ok",
      application: config.name,
      timezone: config.timezone,
      environment: config.nodeEnv,
      database,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("seed")
  async seedHealthData() {
    await this.databaseSeedService.ensureTrainerSettings();
    await this.databaseSeedService.createDemoClient();
    await this.databaseSeedService.createDemoSlot();
    await this.databaseSeedService.createDemoBooking();

    return this.databaseSeedService.readDemoGraph();
  }
}
