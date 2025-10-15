import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaTypeEntity } from '@pro/entities';
import { MediaTypeService } from './media-type.service';
import { MediaTypeResolver } from './media-type.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([MediaTypeEntity])],
  controllers: [],
  providers: [MediaTypeService, MediaTypeResolver],
  exports: [MediaTypeService],
})
export class MediaTypeModule {}
