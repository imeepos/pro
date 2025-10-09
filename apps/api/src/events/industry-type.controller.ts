import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { IndustryTypeService } from './industry-type.service';
import { CreateIndustryTypeDto, UpdateIndustryTypeDto } from './dto/industry-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('industry-types')
@UseGuards(JwtAuthGuard)
export class IndustryTypeController {
  constructor(private readonly industryTypeService: IndustryTypeService) {}

  @Post()
  create(@Body() createDto: CreateIndustryTypeDto) {
    return this.industryTypeService.create(createDto);
  }

  @Get()
  findAll() {
    return this.industryTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.industryTypeService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateIndustryTypeDto) {
    return this.industryTypeService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.industryTypeService.remove(id);
  }
}
