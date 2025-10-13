import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MediaTypeService } from './media-type.service';
import { CreateMediaTypeDto } from './dto/create-media-type.dto';
import { UpdateMediaTypeDto } from './dto/update-media-type.dto';
import { QueryMediaTypeDto } from './dto/query-media-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('media-type')
@UseGuards(JwtAuthGuard)
export class MediaTypeController {
  constructor(private readonly mediaTypeService: MediaTypeService) {}

  @Post()
  create(@Body() createDto: CreateMediaTypeDto) {
    return this.mediaTypeService.create(createDto);
  }

  @Get()
  findAll(@Query() queryDto: QueryMediaTypeDto) {
    return this.mediaTypeService.findAll(queryDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mediaTypeService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMediaTypeDto,
  ) {
    return this.mediaTypeService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.mediaTypeService.remove(id);
  }
}
