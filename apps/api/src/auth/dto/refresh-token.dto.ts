import { IsString, IsNotEmpty } from 'class-validator';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Refresh Token 不能为空' })
  @IsString({ message: 'Refresh Token 必须是字符串' })
  @Field(() => String)
  refreshToken: string;
}
