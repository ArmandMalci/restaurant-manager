import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateShiftDto, UpdateShiftDto } from '@restaurant/shared';

@Injectable()
export class ShiftService {
  public constructor(private readonly prisma: PrismaService) {}

  public findAll(from?: string, to?: string) {
    const where =
      from && to
        ? {
            startTime: {
              gte: new Date(from),
              lt: new Date(new Date(to).getTime() + 86_400_000),
            },
          }
        : undefined;

    return this.prisma.shift.findMany({ where, orderBy: { startTime: 'asc' } });
  }

  public async findOne(id: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id } });

    if (!shift) throw new NotFoundException('Shift not found');

    return shift;
  }

  public create(dto: CreateShiftDto) {
    return this.prisma.shift.create({
      data: {
        staffId: dto.staffId,
        startTime: new Date(dto.startTime),
        endTime: dto.endTime ? new Date(dto.endTime) : null,
      },
    });
  }

  public async update(id: string, dto: UpdateShiftDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};

    if (dto.staffId !== undefined) data.staffId = dto.staffId;
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = dto.endTime ? new Date(dto.endTime) : null;

    return this.prisma.shift.update({ where: { id }, data });
  }

  public async remove(id: string) {
    await this.findOne(id);

    return this.prisma.shift.delete({ where: { id } });
  }
}
