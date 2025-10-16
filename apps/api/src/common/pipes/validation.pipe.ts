import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    // 更严格的验证条件
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    try {
      // 确保 metatype 是一个有效的构造函数
      if (typeof metatype !== 'function' || !metatype.prototype) {
        return value;
      }

      const object = plainToInstance(metatype, value, {
        enableImplicitConversion: true,
      });

      // 如果转换后的对象为 null/undefined，跳过验证
      if (object === null || object === undefined) {
        return value;
      }

      const errors = await validate(object);

      if (errors.length > 0) {
        const messages = errors.map((error) => {
          return Object.values(error.constraints || {}).join(', ');
        });

        throw new BadRequestException({
          message: '数据验证失败',
          errors: messages,
        });
      }

      return object;
    } catch (error) {
      // 如果是我们的验证错误，重新抛出
      if (error instanceof BadRequestException) {
        throw error;
      }

      // 如果是转换或验证过程中的其他错误，记录并返回原始值
      console.error('ValidationPipe error:', error);
      return value;
    }
  }

  private toValidate(metatype: Function): boolean {
    // 更严格的类型检查
    if (!metatype || typeof metatype !== 'function') {
      return false;
    }

    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
