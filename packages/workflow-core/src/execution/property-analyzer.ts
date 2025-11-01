import { INode, IEdge, isDataEdge, isControlEdge } from '../types';

export class PropertyAnalyzer {
    /**
     * 判断节点的某个属性是否是"输入属性"
     * 输入属性定义：没有无条件边指向该属性
     */
    isInputProperty(node: INode, propertyKey: string, edges: IEdge[]): boolean {
        const incomingEdges = edges.filter(edge => edge.to === node.id);

        const relevantEdges = incomingEdges.filter(edge => {
            if (isDataEdge(edge)) {
                return !edge.toProperty || edge.toProperty === propertyKey;
            }
            return true;
        });

        const hasUnconditionalEdge = relevantEdges.some(edge => !isControlEdge(edge) || !edge.condition);

        return !hasUnconditionalEdge;
    }
}
