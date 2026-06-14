import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreateReservationDto, UpdateReservationDto } from '@restaurant/shared';

@Injectable()
export class ReservationService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(date?: string) {
    const where = date
      ? { date: { gte: new Date(date), lt: new Date(new Date(date).getTime() + 86_400_000) } }
      : undefined;
    return this.prisma.reservation.findMany({ where, orderBy: { date: 'asc' } });
  }

  async findOne(id: string) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reservation not found');
    return r;
  }

  create(dto: CreateReservationDto) {
    return this.prisma.reservation.create({
      data: {
        tableId: dto.tableId,
        guestName: dto.guestName,
        guestEmail: dto.guestEmail ?? null,
        guestPhone: dto.guestPhone ?? null,
        partySize: dto.partySize,
        date: new Date(dto.date),
        notes: dto.notes ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateReservationDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.tableId !== undefined) data.tableId = dto.tableId;
    if (dto.guestName !== undefined) data.guestName = dto.guestName;
    if (dto.guestEmail !== undefined) data.guestEmail = dto.guestEmail;
    if (dto.guestPhone !== undefined) data.guestPhone = dto.guestPhone;
    if (dto.partySize !== undefined) data.partySize = dto.partySize;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.notes !== undefined) data.notes = dto.notes;
    return this.prisma.reservation.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.reservation.delete({ where: { id } });
  }
}
