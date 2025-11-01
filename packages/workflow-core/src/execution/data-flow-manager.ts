import { root } from '@pro/core';
import { INPUT, OUTPUT, resolveConstructor } from '../decorator';
import { fromJson } from '../generate';
import { IEdge, INode, isControlEdge, isDataEdge } from '../types';

export class DataFlowManager {
    extractNodeOutputs(node: INode): any {
        try {
            const ast = fromJson(node);
            const ctor = resolveConstructor(ast);
            const outputs = root.get(OUTPUT);
            const outputData: any = {};

            if (outputs && outputs.length > 0) {
                outputs.filter(it => it.target === ctor).map(it => {
                    if ((node as any)[it.propertyKey] !== undefined) {
                        outputData[it.propertyKey] = (node as any)[it.propertyKey];
                    }
                });
                return outputData;
            }
        } catch {
            // 装饰器元数据不可用，使用回退方案
        }

        const outputData: any = {};
        const systemProperties = ['id', 'state', 'type'];

        for (const [key, value] of Object.entries(node as any)) {
            if (!systemProperties.includes(key) && value !== undefined) {
                outputData[key] = value;
            }
        }

        return outputData;
    }

    assignInputsToNode(targetNode: INode, allOutputs: Map<string, any>, edges: IEdge[], allNodes: INode[]): void {
        const incomingEdges = edges.filter(edge => edge.to === targetNode.id);

        const sortedEdges = [...incomingEdges].sort((a, b) => {
            const aPriority = (isControlEdge(a) && a.condition) ? 1 : 0;
            const bPriority = (isControlEdge(b) && b.condition) ? 1 : 0;
            return aPriority - bPriority;
        });

        sortedEdges.forEach(edge => {
            const sourceOutputs = allOutputs.get(edge.from);
            if (!sourceOutputs) return;

            const sourceNode = allNodes.find(n => n.id === edge.from);

            if (isControlEdge(edge) && edge.condition) {
                if (!sourceNode || sourceNode.state !== 'success') return;
                const actualValue = (sourceNode as any)[edge.condition.property];
                if (actualValue !== edge.condition.value) {
                    return;
                }
            }

            if (isDataEdge(edge) && edge.fromProperty && edge.toProperty) {
                const sourceValue = sourceOutputs[edge.fromProperty];
                if (sourceValue !== undefined) {
                    (targetNode as any)[edge.toProperty] = sourceValue;
                }
            } else {
                Object.entries(sourceOutputs).forEach(([key, value]) => {
                    (targetNode as any)[key] = value;
                });
            }
        });
    }

    initializeInputNodes(nodes: INode[], edges: IEdge[], context: Record<string, any>): void {
        for (const node of nodes) {
            const ast = fromJson(node);
            const ctor = resolveConstructor(ast);
            const inputs = root.get(INPUT, []).filter(it => it.target === ctor);

            for (const input of inputs) {
                const propertyKey = String(input.propertyKey);

                if (this.isInputProperty(node, propertyKey, edges)) {
                    const value = this.resolveContextValue(node.id, propertyKey, context);
                    if (value !== undefined) {
                        (node as any)[propertyKey] = value;
                    }
                }
            }
        }
    }

    private resolveContextValue(nodeId: string, propertyKey: string, context: Record<string, any>): any {
        const exactKey = `${nodeId}.${propertyKey}`;
        if (exactKey in context) {
            return context[exactKey];
        }

        if (propertyKey in context) {
            return context[propertyKey];
        }

        return undefined;
    }

    private isInputProperty(node: INode, propertyKey: string, edges: IEdge[]): boolean {
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
