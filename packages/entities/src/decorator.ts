import { EntityOptions, Entity as TypeormEntity } from 'typeorm'
import { InjectionToken, root, Type } from '@pro/core'
export const ENTITY = new InjectionToken<Type<any>[]>(`ENTITY`)

export const Entity = (name?: string | EntityOptions, options?: EntityOptions): ClassDecorator => {
    return (target) => {
        root.set([{ provide: ENTITY, useValue: target, multi: true }])
        if (typeof name === 'string') {
            return TypeormEntity(name, options)(target)
        }
        return TypeormEntity(name)(target)
    }
}