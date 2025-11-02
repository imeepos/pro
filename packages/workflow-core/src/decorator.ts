import { InjectionToken, root, Type } from '@pro/core'

export function resolveConstructor(target: object | Type<any>): Type<any> {
    if (typeof target === 'function') {
        return target as Type<any>;
    }
    if (target && typeof target === 'object' && typeof (target as { constructor?: unknown }).constructor === 'function') {
        return (target as { constructor: Type<any> }).constructor;
    }
    throw new Error('Workflow decorators expect to receive a class constructor or instance.');
}

export const NODE = new InjectionToken<Type<any>[]>(`NODE`)
export function Node(): ClassDecorator {
    return (target) => {
        const ctor = resolveConstructor(target as object);
        root.set([{ provide: NODE, useValue: ctor, multi: true }])
    };
}
export const HANDLER = new InjectionToken<{ ast: Type<any>, target: Type<any> }[]>(`HANDLER`)
export const HANDLER_METHOD = new InjectionToken<{ ast: Type<any>, target: Type<any>, property: string | symbol }[]>(`HANDLER_METHOD`)
export function Handler(ast: Type<any>): any {
    return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor): any => {
        if (propertyKey !== undefined && descriptor !== undefined) {
            const ctor = resolveConstructor(target);
            root.set([{
                provide: HANDLER_METHOD,
                multi: true,
                useValue: {
                    ast: ast, target: ctor, property: propertyKey
                }
            }, {
                provide: ctor,
                useClass: ctor
            }])
            return descriptor;
        } else {
            const ctor = resolveConstructor(target as object);
            root.set([{ provide: ctor, useClass: ctor }, { provide: HANDLER, useValue: { ast, target: ctor }, multi: true }])
            return target;
        }
    };
}

export interface InputOptions {
    /**
     * Marks this input property to accept multiple edge inputs and aggregate them into an array.
     * When isMulti is true, multiple incoming edges will accumulate values into an array instead of overwriting.
     * @default false
     */
    isMulti?: boolean;
}

export interface InputMetadata {
    target: Type<any>;
    propertyKey: string | symbol;
    isMulti?: boolean;
}

export const INPUT = new InjectionToken<InputMetadata[]>(`INPUT`)
export function Input(options?: InputOptions): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);
        root.set([{
            provide: INPUT,
            multi: true,
            useValue: {
                target: ctor,
                propertyKey,
                isMulti: options?.isMulti ?? false
            }
        }])
    };
}

export function getInputMetadata(target: Type<any> | object, propertyKey?: string | symbol): InputMetadata | InputMetadata[] {
    const ctor = resolveConstructor(target);
    const allInputs = root.get(INPUT, []);
    const targetInputs = allInputs.filter(it => it.target === ctor);

    if (propertyKey !== undefined) {
        const metadata = targetInputs.find(it => it.propertyKey === propertyKey);
        return metadata || { target: ctor, propertyKey, isMulti: false };
    }

    return targetInputs;
}
export const OUTPUT = new InjectionToken<{ target: Type<any>, propertyKey: string | symbol }[]>(`OUTPUT`)
export function Output(): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);
        root.set([{ provide: OUTPUT, multi: true, useValue: { target: ctor, propertyKey } }])
    };
}

