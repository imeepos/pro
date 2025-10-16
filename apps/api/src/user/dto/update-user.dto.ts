import { IsString, IsEmail, IsOptional, IsEnum, Validate } from 'class-validator';
import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Field, InputType } from '@nestjs/graphql';
import { UserStatus } from '@pro/types';
import { validateUsername } from '@pro/utils';

@ValidatorConstraint({ name: 'usernameFormat', async: false })
class UsernameFormatValidator implements ValidatorConstraintInterface {
  validate(username: string): boolean {
    return validateUsername(username);
  }

  defaultMessage(): string {
    return '用户名长度为 3-20 位，只能包含字母、数字、下划线和中划线';
  }
}

@InputType()
export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: '用户名必须是字符串' })
  @Validate(UsernameFormatValidator)
  @Field(() => String, { nullable: true })
  username?: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @Field(() => String, { nullable: true })
  email?: string;

  @IsOptional()
  @IsEnum(UserStatus, { message: '无效的用户状态' })
  @Field(() => UserStatus, { nullable: true })
  status?: UserStatus;
}
