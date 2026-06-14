import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { LoginSchema } from '@restaurant/shared';
import { AuthService } from './auth.service';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';

interface FastifyReplyLike {
  setCookie(name: string, value: string, options: object): void;
  clearCookie(name: string, options?: object): void;
}

interface FastifyRequestLike {
  cookies?: Record<string, string>;
}

@Controller('auth')
export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  public async login(
    @Body(new ZodValidationPipe(LoginSchema)) body: { email: string; password: string },
    @Res({ passthrough: true }) res: FastifyReplyLike,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.login(body);

    res.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60,
    });

    return { accessToken, user };
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(JwtRefreshGuard)
  public async refresh(
    @CurrentUser() user: { id: string; email: string; role: string; refreshToken: string },
    @Res({ passthrough: true }) res: FastifyReplyLike,
  ) {
    const { accessToken, refreshToken } = await this.authService.refresh(
      user.id,
      user.email,
      user.role,
      user.refreshToken,
    );

    res.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60,
    });

    return { accessToken };
  }

  @Post('logout')
  @HttpCode(204)
  public async logout(
    @Req() req: FastifyRequestLike,
    @Res({ passthrough: true }) res: FastifyReplyLike,
  ) {
    const token = req.cookies?.refresh_token;

    if (token) await this.authService.logout(token);
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
  }
}
