import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  create(@Body() createDto: CreateTagDto) {
    return this.tagService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page', ParseIntPipe) page = 1,
    @Query('pageSize', ParseIntPipe) pageSize = 20,
    @Query('keyword') keyword?: string,
  ) {
    return this.tagService.findAll(page, pageSize, keyword);
  }

  @Get('popular')
  findPopular(@Query('limit', ParseIntPipe) limit = 20) {
    return this.tagService.findPopular(limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tagService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateTagDto) {
    return this.tagService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tagService.remove(id);
  }
}
