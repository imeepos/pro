import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  WeiboInteractionType,
  WeiboTargetType,
  WeiboVisibleType,
} from '@pro/entities';
import { createOffsetConnectionType } from '../../common/models/pagination.model';

registerEnumType(WeiboInteractionType, {
  name: 'WeiboInteractionType',
});

registerEnumType(WeiboTargetType, {
  name: 'WeiboTargetType',
});

registerEnumType(WeiboVisibleType, {
  name: 'WeiboVisibleType',
});

@ObjectType('WeiboUser')
export class WeiboUserModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  weiboId: string;

  @Field(() => String)
  screenName: string;

  @Field(() => String, { nullable: true })
  profileImageUrl?: string;

  @Field(() => Boolean)
  verified: boolean;

  @Field(() => String, { nullable: true })
  verifiedReason?: string;

  @Field(() => Int)
  followersCount: number;

  @Field(() => Int)
  friendsCount: number;

  @Field(() => Int)
  statusesCount: number;

  @Field(() => String, { nullable: true })
  gender?: string;

  @Field(() => String, { nullable: true })
  location?: string;

  @Field(() => String, { nullable: true })
  description?: string;
}

@ObjectType('WeiboPost')
export class WeiboPostModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  weiboId: string;

  @Field(() => String)
  mid: string;

  @Field(() => WeiboUserModel)
  author: WeiboUserModel;

  @Field(() => String)
  text: string;

  @Field(() => Int)
  textLength: number;

  @Field(() => Boolean)
  isLongText: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Int)
  repostsCount: number;

  @Field(() => Int)
  commentsCount: number;

  @Field(() => Int)
  attitudesCount: number;

  @Field(() => String, { nullable: true })
  source?: string;

  @Field(() => String, { nullable: true })
  regionName?: string;

  @Field(() => Boolean)
  isRepost: boolean;

  @Field(() => Boolean)
  favorited: boolean;

  @Field(() => WeiboVisibleType, { nullable: true })
  visibleType?: WeiboVisibleType;
}

@ObjectType('WeiboComment')
export class WeiboCommentModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  commentId: string;

  @Field(() => String)
  mid: string;

  @Field(() => String)
  postId: string;

  @Field(() => WeiboUserModel)
  author: WeiboUserModel;

  @Field(() => String)
  text: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Int)
  likeCounts: number;

  @Field(() => Boolean)
  liked: boolean;

  @Field(() => String, { nullable: true })
  source?: string;

  @Field(() => String, { nullable: true })
  replyCommentId?: string;

  @Field(() => Boolean)
  isMblogAuthor: boolean;
}

@ObjectType('WeiboInteraction')
export class WeiboInteractionModel {
  @Field(() => ID)
  id: string;

  @Field(() => WeiboInteractionType)
  interactionType: WeiboInteractionType;

  @Field(() => String, { nullable: true })
  userWeiboId?: string;

  @Field(() => WeiboTargetType)
  targetType: WeiboTargetType;

  @Field(() => String)
  targetWeiboId: string;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType('PostStats')
export class PostStatsModel {
  @Field(() => Int)
  totalPosts: number;

  @Field(() => Int)
  totalReposts: number;

  @Field(() => Int)
  totalComments: number;

  @Field(() => Int)
  totalLikes: number;
}

@ObjectType('CommentStats')
export class CommentStatsModel {
  @Field(() => Int)
  totalComments: number;

  @Field(() => Int)
  totalLikes: number;
}

@ObjectType('InteractionStats')
export class InteractionStatsModel {
  @Field(() => Int)
  totalInteractions: number;

  @Field(() => Int)
  totalLikes: number;

  @Field(() => Int)
  totalReposts: number;

  @Field(() => Int)
  totalComments: number;

  @Field(() => Int)
  totalFavorites: number;
}

const WeiboPostConnectionBase = createOffsetConnectionType(WeiboPostModel, 'WeiboPost');
@ObjectType()
export class WeiboPostConnection extends WeiboPostConnectionBase {}

const WeiboCommentConnectionBase = createOffsetConnectionType(WeiboCommentModel, 'WeiboComment');
@ObjectType()
export class WeiboCommentConnection extends WeiboCommentConnectionBase {}

const WeiboInteractionConnectionBase = createOffsetConnectionType(WeiboInteractionModel, 'WeiboInteraction');
@ObjectType()
export class WeiboInteractionConnection extends WeiboInteractionConnectionBase {}
