import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaTypeEntity } from '@pro/entities';
import { MediaTypeService } from './media-type.service';
import { MediaTypeController } from './media-type.controller';
import { MediaTypeResolver } from './media-type.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([MediaTypeEntity])],
  controllers: [MediaTypeController],
  providers: [MediaTypeService, MediaTypeResolver],
  exports: [MediaTypeService],
})
export class MediaTypeModule {}
