import { root } from '@pro/core';
import { Ast, Visitor } from '../ast';
import { HANDLER, HANDLER_METHOD, resolveConstructor } from '../decorator';
import { NoRetryError } from '../errors';

export class VisitorExecutor implements Visitor {
    async visit(ast: Ast, ctx: any): Promise<any> {
        const type = resolveConstructor(ast);

        try {
            const methods = root.get(HANDLER_METHOD, []);
            if (methods && methods.length > 0) {
                const method = methods.find(it => it.ast === type);
                if (method) {
                    const instance = root.get(method.target);
                    if (method.property && typeof (instance as any)[method.property] === 'function') {
                        return await (instance as any)[method.property](ast, ctx);
                    }
                }
            }

            const nodes = root.get(HANDLER, []);
            const handler = nodes.find(it => it.ast === type);
            if (handler) {
                const instance = root.get(handler.target);
                if (typeof (instance as any).visit === 'function') {
                    return await instance.visit(ast, ctx);
                }
                throw new Error(`Handler ${handler.target.name} has no visit method or @Handler decorated method`);
            }

            throw new Error(`not found handler for ${ast.type}`);
        } catch (error) {
            if (error instanceof NoRetryError) {
                throw error;
            }
            throw error;
        }
    }
}

export const defaultVisitorExecutor = new VisitorExecutor();
