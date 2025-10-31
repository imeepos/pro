import { INode, IEdge } from '../types';

export class PropertyAnalyzer {
    /**
     * 判断节点的某个属性是否是"输入属性"
     * 输入属性定义：没有无条件边指向该属性
     */
    isInputProperty(node: INode, propertyKey: string, edges: IEdge[]): boolean {
        const incomingEdges = edges.filter(edge => edge.to === node.id);

        const relevantEdges = incomingEdges.filter(edge =>
            !edge.toProperty || edge.toProperty === propertyKey
        );

        const hasUnconditionalEdge = relevantEdges.some(edge => !edge.condition);

        return !hasUnconditionalEdge;
    }
}
