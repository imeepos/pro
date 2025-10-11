import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { IndustryTypeEntity } from '@pro/entities';
import { EventTypeEntity } from '@pro/entities';
import { EventEntity } from '@pro/entities';
import { TagEntity } from '@pro/entities';
import { EventTagEntity } from '@pro/entities';
import { EventAttachmentEntity } from '@pro/entities';

import { IndustryTypeService } from './industry-type.service';
import { EventTypeService } from './event-type.service';
import { EventService } from './event.service';
import { TagService } from './tag.service';
import { AttachmentService } from './attachment.service';

import { IndustryTypeController } from './industry-type.controller';
import { EventTypeController } from './event-type.controller';
import { EventController } from './event.controller';
import { TagController } from './tag.controller';
import { AttachmentController } from './attachment.controller';

import { getJwtConfig } from '../config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IndustryTypeEntity,
      EventTypeEntity,
      EventEntity,
      TagEntity,
      EventTagEntity,
      EventAttachmentEntity,
    ]),
    ConfigModule,
    JwtModule.register(getJwtConfig()),
  ],
  controllers: [
    IndustryTypeController,
    EventTypeController,
    EventController,
    TagController,
    AttachmentController,
  ],
  providers: [
    IndustryTypeService,
    EventTypeService,
    EventService,
    TagService,
    AttachmentService,
  ],
  exports: [
    IndustryTypeService,
    EventTypeService,
    EventService,
    TagService,
    AttachmentService,
  ],
})
export class EventsModule {}
