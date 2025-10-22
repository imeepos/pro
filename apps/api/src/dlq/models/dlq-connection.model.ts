import { ObjectType } from '@nestjs/graphql';
import { createOffsetConnectionType } from '../../common/models/pagination.model';
import { DlqMessageModel } from './dlq-message.model';

const DlqMessageConnectionBase = createOffsetConnectionType(
  DlqMessageModel,
  'DlqMessage',
);

@ObjectType()
export class DlqMessageConnection extends DlqMessageConnectionBase {}
