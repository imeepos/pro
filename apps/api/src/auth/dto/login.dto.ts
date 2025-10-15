import { IsString, IsNotEmpty } from 'class-validator';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LoginDto {
  @IsNotEmpty({ message: '用户名或邮箱不能为空' })
  @IsString({ message: '用户名或邮箱必须是字符串' })
  @Field(() => String)
  usernameOrEmail: string;

  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须是字符串' })
  @Field(() => String)
  password: string;
}
