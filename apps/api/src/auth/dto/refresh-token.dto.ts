import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Refresh Token 不能为空' })
  @IsString({ message: 'Refresh Token 必须是字符串' })
  refreshToken: string;
}
