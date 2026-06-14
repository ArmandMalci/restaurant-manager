import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { ROLE_HIERARCHY, type StaffRole } from '@restaurant/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<StaffRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!user) return false;

    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const minRequired = Math.min(...required.map((r) => ROLE_HIERARCHY[r] ?? 0));
    return userLevel >= minRequired;
  }
}
