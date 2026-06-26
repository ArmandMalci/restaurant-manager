import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
    const data: Record<string, unknown> = { status: dto.status };

    if (dto.status === 'occupied') data.seatedAt = new Date();
    if (dto.status === 'available') data.seatedAt = null;

    return this.prisma.table.update({ where: { id }, data });
  }

  public saveLayout(tables: { id: string; posX: number; posY: number; shape: string }[]) {
    return this.prisma.$transaction(
      tables.map((t) =>
        this.prisma.table.update({
          where: { id: t.id },
          data: { posX: t.posX, posY: t.posY, shape: t.shape },
        }),
      ),
    );
  }
}
