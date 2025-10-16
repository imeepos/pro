import { Field, ObjectType } from '@nestjs/graphql';
import { UserModel } from '../../user/models/user.model';

@ObjectType('AuthPayload')
export class AuthPayload {
  @Field(() => String)
  accessToken: string;

  @Field(() => String)
  refreshToken: string;

  @Field(() => UserModel)
  user: UserModel;
}
