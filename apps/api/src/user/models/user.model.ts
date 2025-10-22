import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { UserStatus } from '@pro/types';

registerEnumType(UserStatus, {
  name: 'UserStatus',
  description: '用户状态枚举',
});

@ObjectType('User')
export class UserModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  username: string;

  @Field(() => String)
  email: string;

  @Field(() => UserStatus)
  status: UserStatus;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
