import { Ast } from "./ast";
import { applyInputData, applyOutputData, snapshotNode, useNodes } from "./decorator";
import { INode } from "./types";

type NodeJsonPayload = Omit<Partial<INode>, 'type'> & Record<string, unknown> & {
    type: string;
};

function coerceRecord(candidate: unknown): Record<string, unknown> {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        return candidate as Record<string, unknown>;
    }
    return {};
}

export function fromJson<T extends object = any>(json: INode): T {
    const { type, id, state, ...rest } = json;
    const registry = useNodes();
    const ctor = registry.find(node => node.name === type);

    if (!ctor) {
        throw new Error(`Unknown workflow node type "${json.type}".`);
    }

    const instance = new ctor() as T & { id?: string; state?: string };

    const source = coerceRecord(rest);

    applyInputData(instance, source);
    applyOutputData(instance, source);


    if (typeof id === 'string') {
        instance.id = id;
    }

    if (typeof state === 'string') {
        instance.state = state;
    }

    return instance;
}

export function toJson(ast: Ast): NodeJsonPayload {
    const { inputs, outputs } = snapshotNode(ast);
    return {
        ...inputs,
        ...outputs,
        type: ast.type,
        id: ast.id,
        state: ast.state
    };
}
