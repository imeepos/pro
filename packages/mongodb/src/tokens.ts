import { Connection } from 'mongoose'
import { InjectionToken } from '@pro/core'

export const MONGO_CONNECTION = new InjectionToken<Connection>(`MONGO_CONNECTION`)
