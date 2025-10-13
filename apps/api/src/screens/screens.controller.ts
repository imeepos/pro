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
  ParseIntPipe,
} from '@nestjs/common';
import { ScreensService } from './screens.service';
import { CreateScreenDto, UpdateScreenDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('screens')
@UseGuards(JwtAuthGuard)
export class ScreensController {
  constructor(private readonly screensService: ScreensService) {}

  @Post()
  create(@Body() createScreenDto: CreateScreenDto, @Request() req) {
    const userId = req.user.userId;
    return this.screensService.create(createScreenDto, userId);
  }

  @Get()
  findAll(
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
    @Request() req,
  ) {
    const userId = req.user.userId;
    return this.screensService.findAll(page, limit, userId);
  }

  @Get('published')
  findPublished(
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
    @Request() req,
  ) {
    const userId = req.user.userId;
    return this.screensService.findPublished(page, limit, userId);
  }

  @Get('default')
  getDefault(@Request() req) {
    const userId = req.user.userId;
    return this.screensService.getDefault(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.screensService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateScreenDto: UpdateScreenDto,
    @Request() req,
  ) {
    const userId = req.user.userId;
    return this.screensService.update(id, updateScreenDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.screensService.remove(id, userId);
  }

  @Post(':id/copy')
  copy(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.screensService.copy(id, userId);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.screensService.publish(id, userId);
  }

  @Post(':id/draft')
  draft(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.screensService.draft(id, userId);
  }

  @Put('default/:id')
  setDefault(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.screensService.setDefault(id, userId);
  }
}
