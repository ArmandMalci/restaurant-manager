import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreateTableDto, UpdateTableDto, SetTableStatusDto } from '@restaurant/shared';

@Injectable()
export class TableService {
  public constructor(private readonly prisma: PrismaService) {}

  public findAll() {
    return this.prisma.table.findMany({ orderBy: { number: 'asc' } });
  }

  public async findOne(id: string) {
    const table = await this.prisma.table.findUnique({ where: { id } });

    if (!table) throw new NotFoundException('Table not found');

    return table;
  }

  public create(dto: CreateTableDto) {
    return this.prisma.table.create({ data: dto });
  }

  public async update(id: string, dto: UpdateTableDto) {
    await this.findOne(id);

    return this.prisma.table.update({ where: { id }, data: dto });
  }

  public async remove(id: string) {
    await this.findOne(id);

    return this.prisma.table.delete({ where: { id } });
  }

  public async setStatus(id: string, dto: SetTableStatusDto) {
    await this.findOne(id);

    return this.prisma.table.update({ where: { id }, data: { status: dto.status } });
  }
}
