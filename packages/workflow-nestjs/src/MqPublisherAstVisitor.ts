import { Handler, MqPublisherAst, Visitor } from '@pro/workflow-core';
import { Inject, Injectable } from '@pro/core';
import { RabbitMQService } from '@pro/rabbitmq';
import { QueueName } from '@pro/types';

@Handler(MqPublisherAst)
@Injectable()
export class MqPublisherAstVisitor {
  constructor(@Inject(RabbitMQService) private readonly rabbitMQService: RabbitMQService) {}

  async visit(ast: MqPublisherAst, _ctx: Visitor): Promise<MqPublisherAst> {
    ast.state = 'running';

    if (!ast.queue) {
      ast.state = 'fail';
      return ast;
    }

    if (!ast.event) {
      ast.state = 'fail';
      return ast;
    }

    try {
      await this.rabbitMQService.publish(ast.queue as QueueName, ast.event);
      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      throw error;
    }

    return ast;
  }
}
