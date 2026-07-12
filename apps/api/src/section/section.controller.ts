import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SectionDto } from '../swagger-dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SectionService } from './section.service';
import { CreateSectionDto, UpdateSectionDto } from './dto/section.dto';

@ApiTags('sections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sections')
export class SectionController {
  public constructor(private readonly sections: SectionService) {}

  @Get()
  @ApiOperation({ summary: 'List all sections' })
  @ApiResponse({ status: 200, type: [SectionDto] })
  public getAll() {
    return this.sections.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a section by id' })
  @ApiResponse({ status: 200, type: SectionDto })
  public getOne(@Param('id') id: string) {
    return this.sections.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Create a section' })
  @ApiBody({ type: CreateSectionDto })
  @ApiResponse({ status: 201, type: SectionDto })
  public create(@Body() dto: CreateSectionDto) {
    return this.sections.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Update a section' })
  @ApiBody({ type: UpdateSectionDto })
  @ApiResponse({ status: 200, type: SectionDto })
  public update(@Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.sections.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a section' })
  public remove(@Param('id') id: string) {
    return this.sections.remove(id);
  }
}
