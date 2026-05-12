import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

import { createRuntimeLogger } from "../common/logging/runtime-logger";
import { getApiRuntimeConfig } from "../config/app-config.service";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createRuntimeLogger({
    scope: "prisma-service",
    filePath: "logs/api/runtime.jsonl",
    minLevel: "debug",
  });

  constructor() {
    const config = getApiRuntimeConfig();

    super({
      datasourceUrl: config.databaseUrl,
      log: ["warn", "error"],
    });
  }

  async onModuleInit() {
    this.logger.info("Database connection attempt started");

    await this.$connect();

    this.logger.info("Database connection established");
  }

  async onModuleDestroy() {
    await this.$disconnect();

    this.logger.info("Database connection closed");
  }
}
