import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { checkGeoblock } from '@playverzus/core';

@Injectable()
export class GeoblockGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const region = user?.region ?? request.headers['cf-ipcountry'] ?? request.headers['x-region'];

    const result = checkGeoblock(region as string | undefined);
    if (!result.allowed) {
      throw new ForbiddenException(result.reason ?? 'Region blocked under compliance rules');
    }

    return true;
  }
}
