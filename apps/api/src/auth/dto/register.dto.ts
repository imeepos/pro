import { IsString, IsEmail, IsNotEmpty, Validate } from 'class-validator';
import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Field, InputType } from '@nestjs/graphql';
import { validatePassword, validateUsername } from '@pro/utils';

@ValidatorConstraint({ name: 'passwordStrength', async: false })
class PasswordStrengthValidator implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    const result = validatePassword(password);
    return result.valid;
  }

  defaultMessage(): string {
    return '密码长度必须至少为 6 位';
  }
}

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
export class RegisterDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString({ message: '用户名必须是字符串' })
  @Validate(UsernameFormatValidator)
  @Field(() => String)
  username: string;

  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @Field(() => String)
  email: string;

  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须是字符串' })
  @Validate(PasswordStrengthValidator)
  @Field(() => String)
  password: string;
}
