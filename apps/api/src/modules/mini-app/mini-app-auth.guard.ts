import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

import { MiniAppAuthService } from "./mini-app-auth.service";
import { MiniAppSessionPayload } from "./mini-app-auth.types";

export interface MiniAppRequest {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  miniAppSession?: MiniAppSessionPayload;
}

@Injectable()
export class MiniAppAuthGuard implements CanActivate {
  constructor(private readonly miniAppAuthService: MiniAppAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MiniAppRequest>();
    const authorizationHeader = request.headers.authorization;
    const authorization = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]?.trim() ?? ""
      : authorizationHeader?.trim() ?? "";
    const queryTokenRaw = request.query?.accessToken;
    const queryToken = Array.isArray(queryTokenRaw)
      ? queryTokenRaw[0]?.trim() ?? ""
      : queryTokenRaw?.trim() ?? "";

    const token = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : queryToken;

    if (!token) {
      throw new UnauthorizedException("Missing Bearer token");
    }

    request.miniAppSession = this.miniAppAuthService.verifySessionToken(token);
    return true;
  }
}
