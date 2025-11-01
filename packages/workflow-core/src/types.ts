// 抽象语法树的核心表达 - 万物皆为状态
export type IAstStates = `pending` | `running` | `success` | `fail`;

// 状态数据的基础约束
export interface INode extends Record<string, any> {
    state: IAstStates;
    id: string;
    type: string;
}
// 数据流边 - 纯粹的数据传递
export interface IDataEdge {
    from: string;
    fromProperty?: string;  // 支持嵌套属性路径,如 'currentItem.username' 或 'data.user.profile.name'
    to: string;
    toProperty?: string;
    weight?: number;  // 多输入汇聚时的排序权重,值越小优先级越高,未指定时按边定义顺序排列
}

// 控制流边 - 纯粹的执行依赖
export interface IControlEdge {
    from: string;
    to: string;
    condition?: {
        property: string;
        value: any;
    };
}

// 统一边类型
export type IEdge = IDataEdge | IControlEdge;

// 类型守卫函数
export function isDataEdge(edge: IEdge): edge is IDataEdge {
    return 'fromProperty' in edge || 'toProperty' in edge || !('condition' in edge);
}

export function isControlEdge(edge: IEdge): edge is IControlEdge {
    return 'condition' in edge && edge.condition !== undefined;
}