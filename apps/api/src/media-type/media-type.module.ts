import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaTypeEntity } from '../entities/media-type.entity';
import { MediaTypeService } from './media-type.service';
import { MediaTypeController } from './media-type.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MediaTypeEntity])],
  controllers: [MediaTypeController],
  providers: [MediaTypeService],
  exports: [MediaTypeService],
})
export class MediaTypeModule {}
