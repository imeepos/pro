/**
 * 访问方法元数据键
 */
export const VISIT_METHOD_METADATA = 'workflow:visit-method';

/**
 * 访问方法装饰器
 *
 * 标记一个方法作为特定节点类型的访问者方法
 *
 * @param nodeType - 节点类型标识符
 *
 * @example
 * @Injectable()
 * @WorkflowVisitor()
 * export class WeiboWorkflowVisitor {
 *   @VisitMethod('WeiboSearchUrlBuilder')
 *   async visitWeiboSearchUrlBuilder(ast: WeiboSearchUrlBuilderAst, ctx: Context) {
 *     // 自定义处理逻辑
 *     return ast;
 *   }
 * }
 */
export function VisitMethod(nodeType: string): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // 存储元数据：节点类型 -> 方法名映射
    Reflect.defineMetadata(VISIT_METHOD_METADATA, nodeType, target, propertyKey);

    // 在类级别维护一个方法列表
    const existingMethods = Reflect.getMetadata('workflow:visit-methods', target.constructor) || [];
    existingMethods.push({
      nodeType,
      methodName: propertyKey,
    });
    Reflect.defineMetadata('workflow:visit-methods', existingMethods, target.constructor);

    return descriptor;
  };
}

/**
 * 获取类上所有标记的访问方法
 */
export function getVisitMethods(target: any): Array<{ nodeType: string; methodName: string | symbol }> {
  return Reflect.getMetadata('workflow:visit-methods', target) || [];
}
