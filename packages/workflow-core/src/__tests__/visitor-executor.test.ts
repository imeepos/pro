import { describe, it, expect, vi, beforeEach } from 'vitest';
import { root } from '@pro/core';
import { VisitorExecutor } from '../execution/visitor-executor';
import { Ast } from '../ast';
import { HANDLER, HANDLER_METHOD } from '../decorator';
import { NoRetryError } from '../errors';

class TestAst extends Ast {
  type = 'TestAst';
}

class AnotherTestAst extends Ast {
  type = 'AnotherTestAst';
}

describe('VisitorExecutor', () => {
  let executor: VisitorExecutor;

  beforeEach(() => {
    executor = new VisitorExecutor();
    vi.clearAllMocks();
  });

  describe('visit - @Handler 方法执行', () => {
    it('应通过 @Handler 装饰的方法处理 AST', async () => {
      const testAst = new TestAst();
      const mockContext = { data: 'test' };
      const expectedResult = { success: true };

      class TestHandler {
        async handleTest(ast: TestAst, ctx: any) {
          return expectedResult;
        }
      }

      const handlerInstance = new TestHandler();
      const handlerSpy = vi.spyOn(handlerInstance, 'handleTest');

      vi.spyOn(root, 'get').mockImplementation((token: any) => {
        if (token === HANDLER_METHOD) {
          return [
            {
              ast: TestAst,
              target: TestHandler,
              property: 'handleTest',
            },
          ];
        }
        if (token === TestHandler) {
          return handlerInstance;
        }
        if (token === HANDLER) {
          return [];
        }
        return undefined;
      });

      const result = await executor.visit(testAst, mockContext);

      expect(result).toBe(expectedResult);
      expect(handlerSpy).toHaveBeenCalledWith(testAst, mockContext);
      expect(handlerSpy).toHaveBeenCalledTimes(1);
    });

    it('应跳过没有匹配 AST 类型的 @Handler 方法', async () => {
      const testAst = new TestAst();

      class WrongHandler {
        async handleAnother(ast: AnotherTestAst, ctx: any) {
          return { success: false };
        }
      }

      const handlerInstance = new WrongHandler();

      class FallbackHandler {
        async visit(ast: TestAst, ctx: any) {
          return { fallback: true };
        }
      }

      const fallbackInstance = new FallbackHandler();

      vi.spyOn(root, 'get').mockImplementation((token: any) => {
        if (token === HANDLER_METHOD) {
          return [
            {
              ast: AnotherTestAst,
              target: WrongHandler,
              property: 'handleAnother',
            },
          ];
        }
        if (token === HANDLER) {
          return [{ ast: TestAst, target: FallbackHandler }];
        }
        if (token === FallbackHandler) {
          return fallbackInstance;
        }
        return undefined;
      });

      const result = await executor.visit(testAst, {});

      expect(result).toEqual({ fallback: true });
    });
  });

  describe('visit - @Handler 类的 visit 方法执行', () => {
    it('应通过 @Handler 装饰的类的 visit 方法处理 AST', async () => {
      const testAst = new TestAst();
      const mockContext = { data: 'context' };
      const expectedResult = { processed: true };

      class TestAstHandler {
        async visit(ast: TestAst, ctx: any) {
          return expectedResult;
        }
      }

      const handlerInstance = new TestAstHandler();
      const visitSpy = vi.spyOn(handlerInstance, 'visit');

      vi.spyOn(root, 'get').mockImplementation((token: any) => {
        if (token === HANDLER_METHOD) {
          return [];
        }
        if (token === HANDLER) {
          return [{ ast: TestAst, target: TestAstHandler }];
        }
        if (token === TestAstHandler) {
          return handlerInstance;
        }
        return undefined;
      });

      const result = await executor.visit(testAst, mockContext);

      expect(result).toBe(expectedResult);
      expect(visitSpy).toHaveBeenCalledWith(testAst, mockContext);
      expect(visitSpy).toHaveBeenCalledTimes(1);
    });

    it('应在 @Handler 类没有 visit 方法时抛出错误', async () => {
      const testAst = new TestAst();

      class InvalidHandler {}

      const handlerInstance = new InvalidHandler();

      vi.spyOn(root, 'get').mockImplementation((token: any) => {
        if (token === HANDLER_METHOD) {
          return [];
        }
        if (token === HANDLER) {
          return [{ ast: TestAst, target: InvalidHandler }];
        }
        if (token === InvalidHandler) {
          return handlerInstance;
        }
        return undefined;
      });

      await expect(executor.visit(testAst, {})).rejects.toThrow(
        'Handler InvalidHandler has no visit method or @Handler decorated method'
      );
    });
  });

  describe('visit - 错误处理', () => {
    it('应在找不到处理器时抛出错误', async () => {
      const testAst = new TestAst();

      vi.spyOn(root, 'get').mockImplementation((token: any) => {
        if (token === HANDLER_METHOD) {
          return [];
        }
        if (token === HANDLER) {
          return [];
        }
        return undefined;
      });

      await expect(executor.visit(testAst, {})).rejects.toThrow(
        'not found handler for TestAst'
      );
    });

    it('应直接重抛 NoRetryError', async () => {
      const testAst = new TestAst();
      const noRetryError = new NoRetryError('致命错误，不可重试');

      class FailingHandler {
        async visit(ast: TestAst, ctx: any) {
          throw noRetryError;
        }
      }

      const handlerInstance = new FailingHandler();

      vi.spyOn(root, 'get').mockImplementation((token: any) => {
        if (token === HANDLER_METHOD) {
          return [];
        }
        if (token === HANDLER) {
          return [{ ast: TestAst, target: FailingHandler }];
        }
        if (token === FailingHandler) {
          return handlerInstance;
        }
        return undefined;
      });

      await expect(executor.visit(testAst, {})).rejects.toThrow(noRetryError);
      await expect(executor.visit(testAst, {})).rejects.toThrow(NoRetryError);
    });

    it('应向上抛出其他类型的错误', async () => {
      const testAst = new TestAst();
      const genericError = new Error('一般性错误');

      class FailingHandler {
        async visit(ast: TestAst, ctx: any) {
          throw genericError;
        }
      }

      const handlerInstance = new FailingHandler();

      vi.spyOn(root, 'get').mockImplementation((token: any) => {
        if (token === HANDLER_METHOD) {
          return [];
        }
        if (token === HANDLER) {
          return [{ ast: TestAst, target: FailingHandler }];
        }
        if (token === FailingHandler) {
          return handlerInstance;
        }
        return undefined;
      });

      await expect(executor.visit(testAst, {})).rejects.toThrow(genericError);
    });
  });

  describe('visit - 优先级测试', () => {
    it('应优先使用 @Handler 方法而非 @Handler 类', async () => {
      const testAst = new TestAst();
      const methodResult = { source: 'method' };
      const classResult = { source: 'class' };

      class TestHandler {
        async handleTest(ast: TestAst, ctx: any) {
          return methodResult;
        }
        async visit(ast: TestAst, ctx: any) {
          return classResult;
        }
      }

      const handlerInstance = new TestHandler();
      const methodSpy = vi.spyOn(handlerInstance, 'handleTest');
      const visitSpy = vi.spyOn(handlerInstance, 'visit');

      vi.spyOn(root, 'get').mockImplementation((token: any) => {
        if (token === HANDLER_METHOD) {
          return [
            {
              ast: TestAst,
              target: TestHandler,
              property: 'handleTest',
            },
          ];
        }
        if (token === HANDLER) {
          return [{ ast: TestAst, target: TestHandler }];
        }
        if (token === TestHandler) {
          return handlerInstance;
        }
        return undefined;
      });

      const result = await executor.visit(testAst, {});

      expect(result).toBe(methodResult);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(visitSpy).not.toHaveBeenCalled();
    });
  });

  describe('visit - 上下文传递', () => {
    it('应正确传递上下文给处理器', async () => {
      const testAst = new TestAst();
      const complexContext = {
        userId: '123',
        metadata: { timestamp: Date.now() },
        nested: { deep: { value: 'test' } },
      };

      class ContextAwareHandler {
        async visit(ast: TestAst, ctx: any) {
          return { receivedContext: ctx };
        }
      }

      const handlerInstance = new ContextAwareHandler();

      vi.spyOn(root, 'get').mockImplementation((token: any) => {
        if (token === HANDLER_METHOD) {
          return [];
        }
        if (token === HANDLER) {
          return [{ ast: TestAst, target: ContextAwareHandler }];
        }
        if (token === ContextAwareHandler) {
          return handlerInstance;
        }
        return undefined;
      });

      const result = await executor.visit(testAst, complexContext);

      expect(result.receivedContext).toBe(complexContext);
      expect(result.receivedContext).toEqual(complexContext);
    });
  });

  describe('visit - 异步处理', () => {
    it('应正确处理异步 Handler 方法', async () => {
      const testAst = new TestAst();
      const delay = 10;

      class AsyncHandler {
        async handleTest(ast: TestAst, ctx: any) {
          await new Promise(resolve => setTimeout(resolve, delay));
          return { async: true, delay };
        }
      }

      const handlerInstance = new AsyncHandler();

      vi.spyOn(root, 'get').mockImplementation((token: any) => {
        if (token === HANDLER_METHOD) {
          return [
            {
              ast: TestAst,
              target: AsyncHandler,
              property: 'handleTest',
            },
          ];
        }
        if (token === AsyncHandler) {
          return handlerInstance;
        }
        return [];
      });

      const startTime = Date.now();
      const result = await executor.visit(testAst, {});
      const elapsed = Date.now() - startTime;

      expect(result).toEqual({ async: true, delay });
      expect(elapsed).toBeGreaterThanOrEqual(delay);
    });
  });
});
