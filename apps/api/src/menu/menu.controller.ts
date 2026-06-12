import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { MenuService } from './menu.service'
import { CreateMenuCategoryDto, UpdateMenuCategoryDto, CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu.dto'

@ApiTags('menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  // ── Categories ──────────────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List all menu categories' })
  getCategories() {
    return this.menu.findAllCategories()
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get a category by id' })
  getCategory(@Param('id') id: string) {
    return this.menu.findOneCategory(id)
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Create a menu category' })
  createCategory(@Body() dto: CreateMenuCategoryDto) {
    return this.menu.createCategory(dto)
  }

  @Patch('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Update a menu category' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateMenuCategoryDto) {
    return this.menu.updateCategory(id, dto)
  }

  @Delete('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a menu category' })
  removeCategory(@Param('id') id: string) {
    return this.menu.removeCategory(id)
  }

  // ── Items ────────────────────────────────────────────────────────────

  @Get('items')
  @ApiOperation({ summary: 'List menu items, optionally filtered by category' })
  @ApiQuery({ name: 'categoryId', required: false })
  getItems(@Query('categoryId') categoryId?: string) {
    return this.menu.findAllItems(categoryId)
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get a menu item by id' })
  getItem(@Param('id') id: string) {
    return this.menu.findOneItem(id)
  }

  @Post('items')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Create a menu item' })
  createItem(@Body() dto: CreateMenuItemDto) {
    return this.menu.createItem(dto)
  }

  @Patch('items/:id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Update a menu item' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menu.updateItem(id, dto)
  }

  @Delete('items/:id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a menu item' })
  removeItem(@Param('id') id: string) {
    return this.menu.removeItem(id)
  }

  @Patch('items/:id/availability')
  @UseGuards(RolesGuard)
  @Roles('manager', 'kitchen')
  @ApiOperation({ summary: 'Toggle item availability' })
  setAvailability(@Param('id') id: string, @Body('available') available: boolean) {
    return this.menu.setItemAvailability(id, available)
  }
}
