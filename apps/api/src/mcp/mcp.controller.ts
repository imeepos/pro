import { Body, Controller, Get, HttpException, HttpStatus, Post } from '@nestjs/common';
import { GraphqlExecutorService } from './services/graphql-executor.service';
import { MCP_TOOL_DEFINITIONS } from './schemas/mcp-tools.schema';
import { GraphqlExecutorResponse } from './types/graphql-executor.types';
import { IsObject, IsOptional, IsString } from 'class-validator';

class ExecuteGraphqlQueryDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  operationName?: string;
}

@Controller('mcp')
export class McpController {
  constructor(
    private readonly executor: GraphqlExecutorService,
  ) {}

  @Get('tools')
  getToolDefinitions() {
    return MCP_TOOL_DEFINITIONS;
  }

  @Post('tools/execute_graphql_query')
  async executeGraphqlQuery(
    @Body() payload: ExecuteGraphqlQueryDto,
  ): Promise<GraphqlExecutorResponse> {
    try {
      return await this.executor.execute({
        query: payload.query,
        variables: payload.variables,
        operationName: payload.operationName,
      });
    } catch (error) {
      throw new HttpException(
        {
          message: 'GraphQL 查询执行失败',
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
