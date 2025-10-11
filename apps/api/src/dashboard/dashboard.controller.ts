import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Request() req) {
    const userId = req.user.userId;
    return this.dashboardService.getStats(userId);
  }

  @Get('recent-activities')
  async getRecentActivities(@Request() req) {
    const userId = req.user.userId;
    return this.dashboardService.getRecentActivities(userId);
  }
}