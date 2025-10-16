import {
  ArgumentsHost,
  Catch,
  HttpException,
  Logger,
} from '@nestjs/common';
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { QueryFailedError } from 'typeorm';

@Catch()
export class GraphqlExceptionFilter implements GqlExceptionFilter {
  private readonly logger = new Logger(GraphqlExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const context = gqlHost.getContext<{ req?: { url?: string } }>();
    const info = gqlHost.getInfo();

    let status = 500;
    let message: string | string[] = '服务器内部错误';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus() || 500;
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const payload = exceptionResponse as Record<string, any>;
        message = payload.message ?? exception.message;
        errors = payload.errors;
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof QueryFailedError) {
      status = 400;
      message = this.handleDatabaseError(exception);
      this.logger.error(`数据库错误: ${exception.message}`, exception.stack);
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`未处理的错误: ${exception.message}`, exception.stack);
    }

    const messageList = Array.isArray(message) ? message : [message || '未知错误'];
    const formattedResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: context?.req?.url ?? info?.fieldName ?? 'unknown',
      message: messageList,
      ...(errors && { errors }),
    };

    try {
      // 确保 extensions 对象存在且有效
      const extensions = {
        code: status === 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST',
        http: {
          status: Number(status) || 500,
        },
        response: formattedResponse,
      };

      const errorMessage = messageList[0] || '未知错误';

      return new GraphQLError(errorMessage, {
        extensions: extensions || {},
      });
    } catch (error) {
      // 如果构建 GraphQL 错误失败，返回一个简单的错误
      return new GraphQLError('服务器内部错误', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          http: { status: 500 },
        },
      });
    }
  }

  private handleDatabaseError(error: QueryFailedError): string {
    const driverError = (error.driverError || {}) as { code?: string };
    const code = driverError.code;

    switch (code) {
      case '23505':
        return '该数据已存在，请检查唯一字段（如用户名或邮箱）';
      case '23503':
        return '关联数据不存在，请检查外键引用';
      case '23502':
        return '必填字段不能为空';
      case '42P01':
        return '数据库表不存在，请联系管理员';
      case '42703':
        return '数据库字段不存在，请联系管理员';
      case '28P01':
        return '数据库认证失败';
      case '3D000':
        return '数据库不存在';
      default:
        const fallback = error.message?.toLowerCase() || '';
        if (fallback.includes('does not exist')) {
          return '数据库资源不存在，请联系管理员检查数据库配置';
        }
        if (fallback.includes('duplicate key')) {
          return '数据重复，该记录已存在';
        }
        if (fallback.includes('violates')) {
          return '数据约束冲突，请检查输入数据';
        }
        return '数据库操作失败，请稍后重试';
    }
  }
}
