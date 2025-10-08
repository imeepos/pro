import { IsString, IsEmail, IsOptional, IsEnum, Validate } from 'class-validator';
import { UserStatus } from '@pro/types';
import { validateUsername } from '@pro/utils';
import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'usernameFormat', async: false })
class UsernameFormatValidator implements ValidatorConstraintInterface {
  validate(username: string): boolean {
    return validateUsername(username);
  }

  defaultMessage(): string {
    return '用户名长度为 3-20 位，只能包含字母、数字、下划线和中划线';
  }
}

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: '用户名必须是字符串' })
  @Validate(UsernameFormatValidator)
  username?: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @IsOptional()
  @IsEnum(UserStatus, { message: '无效的用户状态' })
  status?: UserStatus;
}
