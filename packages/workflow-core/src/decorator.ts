import type { Visitor } from "./ast";

type MemberKey = string | symbol;

export type NodeConstructor<T extends object = any> = new (...args: any[]) => T;
export type VisitorConstructor<T extends Visitor = Visitor> = new (...args: any[]) => T;

export interface FieldOptions {
    alias?: string;
    required?: boolean;
    defaultValue?: unknown | (() => unknown);
}

export interface FieldMetadata extends FieldOptions {
    property: MemberKey;
    name: string;
}

interface NodeMetadata {
    inputs: FieldMetadata[];
    outputs: FieldMetadata[];
}

const nodeRegistry: Set<NodeConstructor> = new Set();
const visitorRegistry: Map<NodeConstructor, VisitorConstructor> = new Map();
const methodHandlerRegistry: Map<NodeConstructor, Set<[any, string]>> = new Map();

let fieldRegistry: WeakMap<NodeConstructor, NodeMetadata> = new WeakMap();

export function resolveConstructor(target: object | NodeConstructor): NodeConstructor {
    if (typeof target === 'function') {
        return target as NodeConstructor;
    }
    if (target && typeof target === 'object' && typeof (target as { constructor?: unknown }).constructor === 'function') {
        return (target as { constructor: NodeConstructor }).constructor;
    }
    throw new Error('Workflow decorators expect to receive a class constructor or instance.');
}

function ensureMetadata(ctor: NodeConstructor): NodeMetadata {
    let metadata = fieldRegistry.get(ctor);
    if (!metadata) {
        metadata = { inputs: [], outputs: [] };
        fieldRegistry.set(ctor, metadata);
    }
    return metadata;
}

function ensureFieldName(property: MemberKey, alias: string | undefined, ctor: NodeConstructor): string {
    if (typeof property === 'string') {
        return property;
    }
    if (alias) {
        return alias;
    }
    throw new Error(`Symbol property ${String(property)} on ${ctor.name} requires an alias for workflow serialization.`);
}

function upsertField(collection: FieldMetadata[], field: FieldMetadata): void {
    const index = collection.findIndex(item => item.property === field.property);
    if (index >= 0) {
        collection[index] = field;
    } else {
        collection.push(field);
    }
}

function recordField(kind: 'inputs' | 'outputs', target: object, property: MemberKey, options: FieldOptions = {}): void {
    const ctor = resolveConstructor(target);
    const metadata = ensureMetadata(ctor);
    const field: FieldMetadata = {
        property,
        name: ensureFieldName(property, options.alias, ctor),
        ...options
    };
    upsertField(metadata[kind], field);
}

export function Node(): ClassDecorator {
    return (target) => {
        const ctor = resolveConstructor(target as object);
        nodeRegistry.add(ctor);
        ensureMetadata(ctor);
    };
}

export function Handler(ast: NodeConstructor): any {
    return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor): any => {
        if (propertyKey !== undefined && descriptor !== undefined) {
            const ctor = resolveConstructor(target);
            if (!methodHandlerRegistry.has(ast)) {
                methodHandlerRegistry.set(ast, new Set());
            }
            const methodName = typeof propertyKey === 'string' ? propertyKey : propertyKey.toString();
            methodHandlerRegistry.get(ast)!.add([ctor, methodName]);
            return descriptor;
        } else {
            const ctor = resolveConstructor(target as object);
            visitorRegistry.set(ast, ctor);
            return target;
        }
    };
}

export const useNodes = (): NodeConstructor[] => [...nodeRegistry];
export const useVisitors = () => visitorRegistry;
export const useMethodHandlers = () => methodHandlerRegistry;

export function getHandlerMethod(ast: NodeConstructor){
    return methodHandlerRegistry.get(ast);
}

export interface NodeDescriptor {
    ctor: NodeConstructor;
    inputs: readonly FieldMetadata[];
    outputs: readonly FieldMetadata[];
}

export function describeNode(ctor: NodeConstructor): NodeDescriptor {
    const metadata = ensureMetadata(ctor);
    return {
        ctor,
        inputs: [...metadata.inputs],
        outputs: [...metadata.outputs]
    };
}

export function Input(options: FieldOptions = {}): PropertyDecorator {
    return (target, propertyKey) => {
        recordField('inputs', target, propertyKey, options);
    };
}

export function Output(options: FieldOptions = {}): PropertyDecorator {
    return (target, propertyKey) => {
        recordField('outputs', target, propertyKey, options);
    };
}

function listFields(target: object | NodeConstructor, kind: 'inputs' | 'outputs'): FieldMetadata[] {
    const ctor = resolveConstructor(target);
    const metadata = ensureMetadata(ctor);
    return kind === 'inputs' ? metadata.inputs : metadata.outputs;
}

export function getInputs(target: object | NodeConstructor): string[] {
    return listFields(target, 'inputs').map(field => field.name);
}

export function getOutputs(target: object | NodeConstructor): string[] {
    return listFields(target, 'outputs').map(field => field.name);
}

function pickSourceKey(field: FieldMetadata): string {
    return field.alias ?? field.name;
}

export function readNodeValues(instance: object, kind: 'inputs' | 'outputs'): Record<string, unknown> {
    const host = instance as Record<MemberKey, unknown>;
    return listFields(instance, kind).reduce<Record<string, unknown>>((result, field) => {
        const value = host[field.property];
        if (value !== undefined) {
            result[field.alias ?? field.name] = value;
        }
        return result;
    }, {});
}

export function writeNodeValues<T extends object>(instance: T, kind: 'inputs' | 'outputs', source: Record<string, unknown>): T {
    const ctor = resolveConstructor(instance);
    const host = instance as Record<MemberKey, unknown>;
    listFields(instance, kind).forEach(field => {
        const lookupKey = pickSourceKey(field);
        const raw = source[lookupKey];
        if (raw === undefined) {
            if (typeof field.defaultValue === 'function') {
                host[field.property] = (field.defaultValue as () => unknown)();
                return;
            }
            if (field.defaultValue !== undefined) {
                host[field.property] = field.defaultValue;
                return;
            }
            if (field.required) {
                throw new Error(`Workflow node ${ctor.name} is missing required property "${lookupKey}".`);
            }
            return;
        }
        host[field.property] = raw;
    });
    return instance;
}

export function applyInputData<T extends object>(instance: T, source: Record<string, unknown>): T {
    return writeNodeValues(instance, 'inputs', source);
}

export function applyOutputData<T extends object>(instance: T, source: Record<string, unknown>): T {
    return writeNodeValues(instance, 'outputs', source);
}

export interface NodeSnapshot {
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
}

export function snapshotNode(instance: object): NodeSnapshot {
    return {
        inputs: readNodeValues(instance, 'inputs'),
        outputs: readNodeValues(instance, 'outputs')
    };
}

export type VisitorFactory = <T extends Visitor>(ctor: VisitorConstructor<T>) => T;

export function clearNodes(): void {
    nodeRegistry.clear();
    fieldRegistry = new WeakMap();
}

export function clearVisitors(): void {
    visitorRegistry.clear();
    methodHandlerRegistry.clear();
}
