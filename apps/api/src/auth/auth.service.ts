import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import type { LoginDto } from '@restaurant/shared'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const staff = await this.prisma.staff.findUnique({ where: { email } })
    if (!staff || !staff.active) return null
    const valid = await bcrypt.compare(password, staff.passwordHash)
    if (!valid) return null
    const { passwordHash: _omit, ...user } = staff
    return user
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password)
    if (!user) throw new UnauthorizedException('Invalid credentials')
    const accessToken = await this.signAccessToken(user.id, user.email, user.role)
    const refreshToken = await this.createRefreshToken(user.id)
    return { accessToken, refreshToken, user }
  }

  async refresh(staffId: string, email: string, role: string, rawToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: rawToken } })
    if (!stored || stored.staffId !== staffId || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token')
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } })
    const accessToken = await this.signAccessToken(staffId, email, role)
    const refreshToken = await this.createRefreshToken(staffId)
    return { accessToken, refreshToken }
  }

  async logout(rawToken: string) {
    await this.prisma.refreshToken.delete({ where: { token: rawToken } }).catch(() => null)
  }

  private async signAccessToken(sub: string, email: string, role: string) {
    return this.jwt.signAsync(
      { sub, email, role },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '15m' },
    )
  }

  private async createRefreshToken(staffId: string) {
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await this.prisma.refreshToken.create({ data: { token, staffId, expiresAt } })
    return token
  }
}
