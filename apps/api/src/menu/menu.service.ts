import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateMenuCategoryDto, UpdateMenuCategoryDto, CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu.dto'

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Categories ──────────────────────────────────────────────────────

  findAllCategories() {
    return this.prisma.menuCategory.findMany({ orderBy: { sortOrder: 'asc' } })
  }

  async findOneCategory(id: string) {
    const cat = await this.prisma.menuCategory.findUnique({ where: { id } })
    if (!cat) throw new NotFoundException('Category not found')
    return cat
  }

  createCategory(dto: CreateMenuCategoryDto) {
    return this.prisma.menuCategory.create({ data: dto })
  }

  async updateCategory(id: string, dto: UpdateMenuCategoryDto) {
    await this.findOneCategory(id)
    return this.prisma.menuCategory.update({ where: { id }, data: dto })
  }

  async removeCategory(id: string) {
    await this.findOneCategory(id)
    return this.prisma.menuCategory.delete({ where: { id } })
  }

  // ── Items ────────────────────────────────────────────────────────────

  findAllItems(categoryId?: string) {
    return this.prisma.menuItem.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    })
  }

  async findOneItem(id: string) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } })
    if (!item) throw new NotFoundException('Menu item not found')
    return item
  }

  createItem(dto: CreateMenuItemDto) {
    return this.prisma.menuItem.create({ data: { ...dto, price: dto.price } })
  }

  async updateItem(id: string, dto: UpdateMenuItemDto) {
    await this.findOneItem(id)
    return this.prisma.menuItem.update({ where: { id }, data: dto })
  }

  async removeItem(id: string) {
    await this.findOneItem(id)
    return this.prisma.menuItem.delete({ where: { id } })
  }

  async setItemAvailability(id: string, available: boolean) {
    await this.findOneItem(id)
    return this.prisma.menuItem.update({ where: { id }, data: { available } })
  }
}
