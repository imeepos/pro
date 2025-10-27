import { InjectionToken, root, Type } from '@pro/core';
import { modelOptions } from '@typegoose/typegoose';
import type { IModelOptions } from '@typegoose/typegoose/lib/types.js';

export const SCHEMA = new InjectionToken<Type<any>[]>(`SCHEMA`)
export const Schema = (options: IModelOptions): ClassDecorator => {
    return (target: any) => {
        root.set([{ provide: SCHEMA, useValue: target, multi: true }])
        return modelOptions(options)(target)
    }
}