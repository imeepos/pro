import { Field, Float, GraphQLISODateTime, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { EventAttachmentEntity, EventEntity, EventStatus, FileType, EventTagEntity } from '@pro/entities';
import { EventTypeModel, mapEventTypeEntityToModel } from './event-type.model';
import { IndustryTypeModel, mapIndustryTypeEntityToModel } from './industry-type.model';
import { TagModel, mapTagEntityToModel } from './tag.model';
import { createOffsetConnectionType } from '../../common/models/pagination.model';

registerEnumType(FileType, {
  name: 'EventAttachmentFileType',
  description: '事件附件文件类型',
});

@ObjectType('EventAttachment')
export class EventAttachmentModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  eventId: string;

  @Field(() => String)
  fileName: string;

  @Field(() => String)
  fileUrl: string;

  @Field(() => String)
  bucketName: string;

  @Field(() => String)
  objectName: string;

  @Field(() => FileType)
  fileType: FileType;

  @Field(() => Int, { nullable: true })
  fileSize?: number;

  @Field(() => String, { nullable: true })
  mimeType?: string;

  @Field(() => String, { nullable: true })
  fileMd5?: string;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;
}

@ObjectType('Event')
export class EventModel {
  @Field(() => ID)
  id: string;

  @Field(() => EventStatus)
  status: EventStatus;

  @Field(() => String)
  eventName: string;

  @Field(() => String, { nullable: true })
  summary?: string;

  @Field(() => GraphQLISODateTime)
  occurTime: Date;

  @Field(() => String)
  province: string;

  @Field(() => String)
  city: string;

  @Field(() => String, { nullable: true })
  district?: string;

  @Field(() => String, { nullable: true })
  street?: string;

  @Field(() => String, { nullable: true })
  locationText?: string;

  @Field(() => Float, { nullable: true })
  longitude?: number;

  @Field(() => Float, { nullable: true })
  latitude?: number;

  @Field(() => ID)
  eventTypeId: string;

  @Field(() => ID)
  industryTypeId: string;

  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;

  @Field(() => EventTypeModel, { nullable: true })
  eventType?: EventTypeModel | null;

  @Field(() => IndustryTypeModel, { nullable: true })
  industryType?: IndustryTypeModel | null;

  @Field(() => [TagModel])
  tags: TagModel[];

  @Field(() => [EventAttachmentModel])
  attachments: EventAttachmentModel[];
}

const EventConnectionBase = createOffsetConnectionType(EventModel, 'Event');

@ObjectType()
export class EventConnection extends EventConnectionBase {}

@ObjectType('EventMapPoint')
export class EventMapPointModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  eventName: string;

  @Field(() => String, { nullable: true })
  summary?: string;

  @Field(() => GraphQLISODateTime)
  occurTime: Date;

  @Field(() => String)
  province: string;

  @Field(() => String)
  city: string;

  @Field(() => String, { nullable: true })
  district?: string;

  @Field(() => String, { nullable: true })
  street?: string;

  @Field(() => Float)
  longitude: number;

  @Field(() => Float)
  latitude: number;

  @Field(() => EventStatus)
  status: EventStatus;

  @Field(() => ID)
  eventTypeId: string;

  @Field(() => ID)
  industryTypeId: string;
}

export const mapEventAttachmentEntityToModel = (attachment: EventAttachmentEntity): EventAttachmentModel => ({
  id: attachment.id,
  eventId: attachment.eventId,
  fileName: attachment.fileName,
  fileUrl: attachment.fileUrl,
  bucketName: attachment.bucketName,
  objectName: attachment.objectName,
  fileType: attachment.fileType,
  fileSize: attachment.fileSize ?? undefined,
  mimeType: attachment.mimeType ?? undefined,
  fileMd5: attachment.fileMd5 ?? undefined,
  sortOrder: attachment.sortOrder,
  createdAt: attachment.createdAt,
});

const toTagModels = (eventTags?: EventTagEntity[] | null): TagModel[] => {
  if (!eventTags) {
    return [];
  }

  return eventTags
    .map((eventTag) => eventTag.tag)
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
    .map(mapTagEntityToModel);
};

export const mapEventEntityToModel = (event: EventEntity): EventModel => ({
  id: event.id,
  status: event.status,
  eventName: event.eventName,
  summary: event.summary ?? undefined,
  occurTime: event.occurTime,
  province: event.province,
  city: event.city,
  district: event.district ?? undefined,
  street: event.street ?? undefined,
  locationText: event.locationText ?? undefined,
  longitude: event.longitude ?? undefined,
  latitude: event.latitude ?? undefined,
  eventTypeId: event.eventTypeId,
  industryTypeId: event.industryTypeId,
  createdBy: event.createdBy ?? undefined,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
  eventType: event.eventType ? mapEventTypeEntityToModel(event.eventType) : null,
  industryType: event.industryType ? mapIndustryTypeEntityToModel(event.industryType) : null,
  tags: toTagModels(event.eventTags),
  attachments: (event.attachments ?? []).map(mapEventAttachmentEntityToModel),
});

export const mapEventEntityToMapPoint = (event: EventEntity): EventMapPointModel => ({
  id: event.id,
  eventName: event.eventName,
  summary: event.summary ?? undefined,
  occurTime: event.occurTime,
  province: event.province,
  city: event.city,
  district: event.district ?? undefined,
  street: event.street ?? undefined,
  longitude: event.longitude ?? 0,
  latitude: event.latitude ?? 0,
  status: event.status,
  eventTypeId: event.eventTypeId,
  industryTypeId: event.industryTypeId,
});
