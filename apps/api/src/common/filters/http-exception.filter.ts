import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = '服务器内部错误';
    let errors: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        const extractedMessage = responseObj['message'];
        if (typeof extractedMessage === 'string' || Array.isArray(extractedMessage)) {
          message = extractedMessage;
        } else {
          message = exception.message;
        }

        if ('errors' in responseObj) {
          errors = responseObj['errors'];
        }
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof QueryFailedError) {
      // 数据库查询错误
      status = HttpStatus.BAD_REQUEST;
      message = this.handleDatabaseError(exception);
      this.logger.error(`数据库错误: ${exception.message}`, exception.stack);
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`未处理的错误: ${exception.message}`, exception.stack);
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: Array.isArray(message) ? message : [message],
      ...(errors && { errors }),
    };

    response.status(status).json(errorResponse);
  }

  /**
   * 处理数据库错误，返回友好的错误提示
   */
  private handleDatabaseError(error: QueryFailedError): string {
    const driverError = this.extractDriverError(error);
    const code = driverError?.code;

    // PostgreSQL 错误码处理
    switch (code) {
      case '23505': // unique_violation
        return '该数据已存在，请检查唯一字段（如用户名或邮箱）';
      case '23503': // foreign_key_violation
        return '关联数据不存在，请检查外键引用';
      case '23502': // not_null_violation
        return '必填字段不能为空';
      case '42P01': // undefined_table
        return '数据库表不存在，请联系管理员';
      case '42703': // undefined_column
        return '数据库字段不存在，请联系管理员';
      case '28P01': // invalid_password
        return '数据库认证失败';
      case '3D000': // invalid_catalog_name
        return '数据库不存在';
      default:
        // 检查错误消息中的关键字
        const message = error.message?.toLowerCase() || '';
        if (message.includes('does not exist')) {
          return '数据库资源不存在，请联系管理员检查数据库配置';
        }
        if (message.includes('duplicate key')) {
          return '数据重复，该记录已存在';
        }
        if (message.includes('violates')) {
          return '数据约束冲突，请检查输入数据';
        }
        return '数据库操作失败，请稍后重试';
    }
  }

  private extractDriverError(error: QueryFailedError): { code?: string } | null {
    const candidate = (error as QueryFailedError & { driverError?: unknown }).driverError;
    return typeof candidate === 'object' && candidate !== null ? (candidate as { code?: string }) : null;
  }
}
