import { InjectionToken, root, Type } from '@pro/core';
import { getModelForClass, modelOptions } from '@typegoose/typegoose';
import type { IModelOptions } from '@typegoose/typegoose/lib/types.js';
import { MONGO_CONNECTION } from '../tokens.js';
import { Connection } from 'mongoose';

export const SCHEMA = new InjectionToken<Type<any>[]>(`SCHEMA`)
export const Schema = (options: IModelOptions): ClassDecorator => {
    return (target: any) => {
        root.set([
            { provide: SCHEMA, useValue: target, multi: true },
            {
                provide: target,
                useFactory: (connection: Connection) => {
                    const cls = getModelForClass(target, { existingConnection: connection })
                    return connection.model(cls.name, cls.schema);
                },
                deps: [MONGO_CONNECTION]
            }
        ])
        return modelOptions(options)(target)
    }
}