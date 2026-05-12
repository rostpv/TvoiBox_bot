import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DatabaseHealthService {
  constructor(private readonly prismaService: PrismaService) {}

  async ping() {
    await this.prismaService.$queryRaw`SELECT 1`;

    return {
      status: "ok",
    };
  }
}
