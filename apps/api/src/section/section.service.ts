import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSectionDto, UpdateSectionDto } from '@restaurant/shared';

@Injectable()
export class SectionService {
  public constructor(private readonly prisma: PrismaService) {}

  public findAll() {
    return this.prisma.section.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  public async findOne(id: string) {
    const section = await this.prisma.section.findUnique({ where: { id } });

    if (!section) throw new NotFoundException('Section not found');

    return section;
  }

  public create(dto: CreateSectionDto) {
    return this.prisma.section.create({ data: dto });
  }

  public async update(id: string, dto: UpdateSectionDto) {
    await this.findOne(id);

    return this.prisma.section.update({ where: { id }, data: dto });
  }

  public async remove(id: string) {
    await this.findOne(id);

    const tableCount = await this.prisma.table.count({ where: { sectionId: id } });

    if (tableCount > 0) {
      throw new ConflictException('Cannot delete a section that still has tables');
    }

    return this.prisma.section.delete({ where: { id } });
  }
}
