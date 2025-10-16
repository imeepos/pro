import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * UUID 验证异常过滤器
 * 专门处理 UUID 验证相关的异常，提供结构化的错误响应
 */
@Catch(HttpException)
export class UuidValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UuidValidationExceptionFilter.name);

  /**
   * 捕获并处理 UUID 验证异常
   *
   * @param exception HTTP 异常
   * @param host 参数宿主
   */
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // 记录错误日志
    this.logger.error(
      `UUID 验证失败 - URL: ${request.url}, Method: ${request.method}`,
      exception.stack,
    );

    let errorResponse: any;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as any;

      // 自定义的 UUID 验证错误
      if (this.isUuidValidationError(responseObj)) {
        errorResponse = {
          success: false,
          message: responseObj.message || 'UUID 验证失败',
          error: {
            type: 'UUID_VALIDATION_ERROR',
            code: responseObj.code || 'INVALID_UUID',
            details: responseObj.error || 'UUID 格式不正确',
            field: responseObj.field || 'ID',
            value: responseObj.value,
            expectedFormat: responseObj.expectedFormat || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
            suggestion: this.getSuggestion(responseObj),
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
          },
        };

        // 特殊处理路由混淆错误
        if (responseObj.code === 'ROUTE_CONFUSION') {
          this.handleRouteConfusion(errorResponse, request);
        }
      } else {
        // 其他类型的错误
        errorResponse = {
          success: false,
          message: responseObj.message || '请求处理失败',
          error: {
            type: 'HTTP_ERROR',
            code: status === HttpStatus.BAD_REQUEST ? 'BAD_REQUEST' : 'INTERNAL_ERROR',
            details: responseObj.error || '请求参数错误',
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
          },
        };
      }
    } else {
      // 简单的错误信息
      errorResponse = {
        success: false,
        message: exception.message || '请求处理失败',
        error: {
          type: 'SIMPLE_ERROR',
          code: status === HttpStatus.BAD_REQUEST ? 'BAD_REQUEST' : 'INTERNAL_ERROR',
          details: '请求处理过程中发生错误',
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
        },
      };
    }

    response.status(status).json(errorResponse);
  }

  /**
   * 判断是否为 UUID 验证错误
   */
  private isUuidValidationError(errorResponse: any): boolean {
    return (
      errorResponse.code === 'INVALID_UUID_FORMAT' ||
      errorResponse.code === 'ROUTE_CONFUSION' ||
      errorResponse.code === 'EMPTY_UUID' ||
      errorResponse.code === 'INVALID_UUID_ARRAY' ||
      errorResponse.code === 'INVALID_ARRAY_FORMAT' ||
      (errorResponse.field && errorResponse.expectedFormat)
    );
  }

  /**
   * 获取错误建议
   */
  private getSuggestion(errorResponse: any): string {
    if (errorResponse.code === 'ROUTE_CONFUSION') {
      return errorResponse.suggestion || '请检查前端路由配置，确保传递的是有效的 UUID 而不是路由名称';
    }

    if (errorResponse.value && typeof errorResponse.value === 'string') {
      if (errorResponse.value.includes('/')) {
        return '检测到路径格式，请确认是否传递了错误的 URL 路径而不是 UUID';
      }

      if (errorResponse.value.length < 10) {
        return 'UUID 长度不足，请确保传递了完整的 UUID 字符串';
      }
    }

    return `请确保传递的是有效的 UUID v4 格式字符串，例如: ${errorResponse.expectedFormat || '550e8400-e29b-41d4-a716-446655440000'}`;
  }

  /**
   * 处理路由混淆的特殊情况
   */
  private handleRouteConfusion(errorResponse: any, request: Request): void {
    const suspiciousValue = errorResponse.error.value;

    // 记录详细信息用于调试
    this.logger.warn(
      `检测到可能的路由混淆 - 客户端传递了 "${suspiciousValue}" 作为 UUID，URL: ${request.url}`,
    );

    // 检查常见的路由名称模式
    const commonRoutes = [
      'statistics', 'stats', 'summary', 'report', 'data', 'info',
      'list', 'all', 'create', 'update', 'delete', 'search'
    ];

    if (commonRoutes.includes(suspiciousValue.toLowerCase())) {
      errorResponse.error.additionalInfo = {
        possibleCause: '前端可能将路由名称错误地传递为参数',
        recommendedAction: '检查前端代码，确保在调用需要 UUID 的 API 时传递正确的参数',
        commonMistake: `将路由 "/bugs/${suspiciousValue}" 错误地解析为 UUID 参数`,
      };
    }
  }
}