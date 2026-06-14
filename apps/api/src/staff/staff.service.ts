import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateStaffDto, UpdateStaffDto } from '@restaurant/shared';

@Injectable()
export class StaffService {
  public constructor(private readonly prisma: PrismaService) {}

  private strip({ passwordHash: _p, ...s }: Record<string, unknown>) {
    return s;
  }

  public async findAll(role?: string) {
    const rows = await this.prisma.staff.findMany({
      where: role ? { role: role as never } : undefined,
      orderBy: { name: 'asc' },
    });

    return rows.map((r) => this.strip(r as never));
  }

  public async findOne(id: string) {
    const s = await this.prisma.staff.findUnique({ where: { id } });

    if (!s) throw new NotFoundException('Staff not found');

    return this.strip(s as never);
  }

  public async create(dto: CreateStaffDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const s = await this.prisma.staff.create({
      data: {
        name: dto.name,
        email: dto.email,
        role: dto.role as never,
        active: dto.active ?? true,
        passwordHash,
      },
    });

    return this.strip(s as never);
  }

  public async update(id: string, dto: UpdateStaffDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
    const s = await this.prisma.staff.update({ where: { id }, data });

    return this.strip(s as never);
  }

  public async remove(id: string) {
    await this.findOne(id);

    return this.prisma.staff.delete({ where: { id } });
  }

  public async setActive(id: string, active: boolean) {
    await this.findOne(id);
    const s = await this.prisma.staff.update({ where: { id }, data: { active } });

    return this.strip(s as never);
  }
}
