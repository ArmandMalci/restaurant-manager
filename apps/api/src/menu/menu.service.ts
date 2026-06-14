import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type {
  CreateMenuCategoryDto,
  UpdateMenuCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
} from '@restaurant/shared';

@Injectable()
export class MenuService {
  public constructor(private readonly prisma: PrismaService) {}

  // ── Categories ──────────────────────────────────────────────────────

  public findAllCategories() {
    return this.prisma.menuCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  public async findOneCategory(id: string) {
    const cat = await this.prisma.menuCategory.findUnique({ where: { id } });

    if (!cat) throw new NotFoundException('Category not found');

    return cat;
  }

  public createCategory(dto: CreateMenuCategoryDto) {
    return this.prisma.menuCategory.create({ data: dto });
  }

  public async updateCategory(id: string, dto: UpdateMenuCategoryDto) {
    await this.findOneCategory(id);

    return this.prisma.menuCategory.update({ where: { id }, data: dto });
  }

  public async removeCategory(id: string) {
    await this.findOneCategory(id);

    return this.prisma.menuCategory.delete({ where: { id } });
  }

  // ── Items ────────────────────────────────────────────────────────────

  public findAllItems(categoryId?: string) {
    return this.prisma.menuItem.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });
  }

  public async findOneItem(id: string) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } });

    if (!item) throw new NotFoundException('Menu item not found');

    return item;
  }

  public createItem(dto: CreateMenuItemDto) {
    return this.prisma.menuItem.create({ data: { ...dto, price: dto.price } });
  }

  public async updateItem(id: string, dto: UpdateMenuItemDto) {
    await this.findOneItem(id);

    return this.prisma.menuItem.update({ where: { id }, data: dto });
  }

  public async removeItem(id: string) {
    await this.findOneItem(id);

    return this.prisma.menuItem.delete({ where: { id } });
  }

  public async setItemAvailability(id: string, available: boolean) {
    await this.findOneItem(id);

    return this.prisma.menuItem.update({ where: { id }, data: { available } });
  }
}
