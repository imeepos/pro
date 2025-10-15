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
import { TagResolver } from './tag.resolver';
import { EventTypeResolver } from './event-type.resolver';
import { IndustryTypeResolver } from './industry-type.resolver';
import { EventResolver } from './event.resolver';
import { EventTypeLoader } from './event-type.loader';
import { IndustryTypeLoader } from './industry-type.loader';
import { TagLoader } from './tag.loader';
import { AttachmentResolver } from './attachment.resolver';
import { AttachmentUploadTokenEntity } from './entities/attachment-upload-token.entity';

import { createJwtConfig } from '../config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IndustryTypeEntity,
      EventTypeEntity,
      EventEntity,
      TagEntity,
      EventTagEntity,
      EventAttachmentEntity,
      AttachmentUploadTokenEntity,
    ]),
    ConfigModule,
    JwtModule.registerAsync(createJwtConfig()),
  ],
  controllers: [],
  providers: [
    IndustryTypeService,
    EventTypeService,
    EventService,
    TagService,
    AttachmentService,
    TagResolver,
    EventTypeResolver,
    IndustryTypeResolver,
    EventResolver,
    AttachmentResolver,
    EventTypeLoader,
    IndustryTypeLoader,
    TagLoader,
  ],
  exports: [
    IndustryTypeService,
    EventTypeService,
    EventService,
    TagService,
    AttachmentService,
    EventTypeLoader,
    IndustryTypeLoader,
    TagLoader,
  ],
})
export class EventsModule {}
