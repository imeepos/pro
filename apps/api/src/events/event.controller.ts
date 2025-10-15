import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseFloatPipe,
} from '@nestjs/common';
import { EventService } from './event.service';
import {
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
  EventMapQueryDto,
} from './dto/event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  create(@Body() createDto: CreateEventDto, @Request() req) {
    const userId = req.user.userId;
    return this.eventService.create(createDto, userId);
  }

  @Get()
  findAll(@Query() queryDto: EventQueryDto) {
    return this.eventService.findAll(queryDto);
  }

  @Get('nearby')
  findNearby(
    @Query('longitude', ParseFloatPipe) longitude: number,
    @Query('latitude', ParseFloatPipe) latitude: number,
    @Query('radius', ParseFloatPipe) radius: number,
  ) {
    return this.eventService.findNearby(longitude, latitude, radius);
  }

  @Get('by-tag/:tagId')
  findByTag(@Param('tagId') tagId: string) {
    return this.eventService.findByTag(tagId);
  }

  @Get('map')
  findForMap(@Query() queryDto: EventMapQueryDto) {
    return this.eventService.findForMap(queryDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEventDto,
    @Request() req,
  ) {
    const userId = req.user.userId;
    return this.eventService.update(id, updateDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.eventService.remove(id, userId);
  }

  @Put(':id/publish')
  publish(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.eventService.publish(id, userId);
  }

  @Put(':id/archive')
  archive(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.eventService.archive(id, userId);
  }

  @Post(':eventId/tags')
  addTags(
    @Param('eventId') eventId: string,
    @Body('tagIds') tagIds: string[],
  ) {
    return this.eventService.addTagsToEvent(eventId, tagIds);
  }

  @Delete(':eventId/tags/:tagId')
  removeTag(
    @Param('eventId') eventId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.eventService.removeTagFromEvent(eventId, tagId);
  }
}
