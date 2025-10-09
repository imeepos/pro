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
import { EventTypeService } from './event-type.service';
import { CreateEventTypeDto, UpdateEventTypeDto } from './dto/event-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('event-types')
@UseGuards(JwtAuthGuard)
export class EventTypeController {
  constructor(private readonly eventTypeService: EventTypeService) {}

  @Post()
  create(@Body() createDto: CreateEventTypeDto) {
    return this.eventTypeService.create(createDto);
  }

  @Get()
  findAll() {
    return this.eventTypeService.findAll();
  }

  
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventTypeService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateEventTypeDto) {
    return this.eventTypeService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventTypeService.remove(id);
  }
}
