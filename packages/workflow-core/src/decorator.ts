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
                provide: HANDLER_METHOD, multi: true, useValue: {
                    ast: ast, target: ctor, property: propertyKey
                }
            }])
            return descriptor;
        } else {
            const ctor = resolveConstructor(target as object);
            root.set([{ provide: HANDLER, useValue: { ast, target: ctor }, multi: true }])
            return target;
        }
    };
}

export const INPUT = new InjectionToken<{ target: Type<any>, propertyKey: string | symbol }[]>(`INPUT`)
export function Input(): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);
        root.set([{ provide: INPUT, multi: true, useValue: { target: ctor, propertyKey } }])
    };
}
export const OUTPUT = new InjectionToken<{ target: Type<any>, propertyKey: string | symbol }[]>(`OUTPUT`)
export function Output(): PropertyDecorator {
    return (target, propertyKey) => {
        const ctor = resolveConstructor(target);
        root.set([{ provide: OUTPUT, multi: true, useValue: { target: ctor, propertyKey } }])
    };
}

