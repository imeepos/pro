import { root } from '@pro/core';
import { INPUT, OUTPUT, resolveConstructor, getInputMetadata, InputMetadata } from '../decorator';
import { fromJson } from '../generate';
import { IEdge, INode, isControlEdge, isDataEdge } from '../types';

export class DataFlowManager {
    private resolveNestedProperty(obj: any, path: string): any {
        if (!path.includes('.')) {
            return obj?.[path];
        }
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
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
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            const aWeight = isDataEdge(a) ? (a.weight ?? Infinity) : Infinity;
            const bWeight = isDataEdge(b) ? (b.weight ?? Infinity) : Infinity;
            return aWeight - bWeight;
        });

        const inputMetadataMap = new Map<string | symbol, InputMetadata>();

        try {
            const ast = fromJson(targetNode);
            const ctor = resolveConstructor(ast);
            const allInputs = getInputMetadata(ctor);
            if (Array.isArray(allInputs)) {
                allInputs.forEach(meta => {
                    inputMetadataMap.set(meta.propertyKey, meta);
                });
            }
        } catch {
            // 装饰器元数据不可用，继续不支持 isMulti
        }

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
                const sourceValue = this.resolveNestedProperty(sourceOutputs, edge.fromProperty);
                if (sourceValue !== undefined) {
                    this.assignValueToProperty(targetNode, edge.toProperty, sourceValue, inputMetadataMap);
                }
            } else {
                Object.entries(sourceOutputs).forEach(([key, value]) => {
                    this.assignValueToProperty(targetNode, key, value, inputMetadataMap);
                });
            }
        });
    }

    private assignValueToProperty(
        targetNode: INode,
        propertyKey: string | symbol,
        value: any,
        inputMetadataMap: Map<string | symbol, InputMetadata>
    ): void {
        const metadata = inputMetadataMap.get(propertyKey);
        const isMulti = metadata?.isMulti ?? false;

        if (isMulti) {
            if (!Array.isArray((targetNode as any)[propertyKey])) {
                (targetNode as any)[propertyKey] = [];
            }
            (targetNode as any)[propertyKey].push(value);
        } else {
            (targetNode as any)[propertyKey] = value;
        }
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
