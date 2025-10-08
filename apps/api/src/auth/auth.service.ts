import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../entities/user.entity';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import { AuthResponse, JwtPayload, User, UserStatus } from '@pro/types';
import { RedisClient } from '@pro/redis';
import { getRedisConfig, getRefreshTokenExpiresIn } from '../config';

@Injectable()
export class AuthService {
  private redisClient: RedisClient;
  private readonly TOKEN_BLACKLIST_PREFIX = 'blacklist:';
  private readonly REFRESH_TOKEN_PREFIX = 'refresh:';

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {
    this.redisClient = new RedisClient(getRedisConfig());
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { username, email, password } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException('用户名已存在');
      }
      if (existingUser.email === email) {
        throw new ConflictException('邮箱已被注册');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.save(user);

    return this.generateAuthResponse(savedUser);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { usernameOrEmail, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('账户已被禁用');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    return this.generateAuthResponse(user);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);

      const isBlacklisted = await this.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token 已失效');
      }

      const storedToken = await this.redisClient.get<string>(
        `${this.REFRESH_TOKEN_PREFIX}${payload.userId}`,
      );

      if (storedToken !== refreshToken) {
        throw new UnauthorizedException('无效的 Refresh Token');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('账户已被禁用');
      }

      await this.addTokenToBlacklist(refreshToken, payload.exp);

      return this.generateAuthResponse(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('无效的 Refresh Token');
    }
  }

  async logout(accessToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(accessToken);

      await this.addTokenToBlacklist(accessToken, payload.exp);

      await this.redisClient.del(
        `${this.REFRESH_TOKEN_PREFIX}${payload.userId}`,
      );
    } catch (error) {
      throw new BadRequestException('无效的 Token');
    }
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return this.sanitizeUser(user);
  }

  private async generateAuthResponse(user: UserEntity): Promise<AuthResponse> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: getRefreshTokenExpiresIn(),
    });

    const refreshTokenTTL = this.parseExpiration(getRefreshTokenExpiresIn());
    await this.redisClient.set(
      `${this.REFRESH_TOKEN_PREFIX}${user.id}`,
      refreshToken,
      refreshTokenTTL,
    );

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  private sanitizeUser(user: UserEntity): User {
    const { password, ...sanitized } = user;
    return sanitized as User;
  }

  private async addTokenToBlacklist(
    token: string,
    exp: number,
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;

    if (ttl > 0) {
      await this.redisClient.set(`${this.TOKEN_BLACKLIST_PREFIX}${token}`, '1', ttl);
    }
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.redisClient.exists(`${this.TOKEN_BLACKLIST_PREFIX}${token}`);
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([dhms])$/);
    if (!match) return 3600;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      d: 86400,
      h: 3600,
      m: 60,
      s: 1,
    };

    return value * (multipliers[unit] || 3600);
  }
}
