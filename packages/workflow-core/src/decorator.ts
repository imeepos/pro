/**
 * 定义节点输入数据
 */
export function Input(): PropertyDecorator {
    return (target: any, propertyKey: string | symbol) => {
        // 在目标对象上标记这个属性是输入
        if (!target._inputs) {
            target._inputs = new Set();
        }
        target._inputs.add(propertyKey);
    };
}
/**
 * 定义节点输出数据
 */
export function Output(): PropertyDecorator {
    return (target: any, propertyKey: string | symbol) => {
        // 在目标对象上标记这个属性是输出
        if (!target._outputs) {
            target._outputs = new Set();
        }
        target._outputs.add(propertyKey);
    };
}

/**
   * 获取节点的输入属性
   */
export function getInputs(instance: any): string[] {
    return Array.from(instance._inputs || []);
}

/**
 * 获取节点的输出属性
 */
export function getOutputs(instance: any): string[] {
    return Array.from(instance._outputs || []);
}

/**
 * 收集节点的输入数据
 */
export function collectInputData(instance: any): Record<string, any> {
    const inputs = getInputs(instance);
    const data: Record<string, any> = {};
    inputs.forEach(key => {
        if (instance[key] !== undefined) {
            data[key] = instance[key];
        }
    });
    return data;
}

/**
  * 收集节点的输出数据
  */
export function collectOutputData(instance: any): Record<string, any> {
    const outputs = getOutputs(instance);
    const data: Record<string, any> = {};

    outputs.forEach(key => {
        if (instance[key] !== undefined) {
            data[key] = instance[key];
        }
    });

    return data;
}


/**
 * 收集输入输出节点
 */

export function collectData(instance: any): Record<string, any> {
    return {
        ...collectInputData(instance),
        ...collectOutputData(instance)
    }
}