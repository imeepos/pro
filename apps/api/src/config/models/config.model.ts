import { Field, GraphQLISODateTime, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ConfigType } from '../dto/config.dto';

registerEnumType(ConfigType, {
  name: 'ConfigType',
  description: '配置项类型标识',
});

@ObjectType('ConfigValue')
export class ConfigValueModel {
  @Field(() => String)
  value: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  expiresAt?: Date;
}

@ObjectType('ConfigCacheStats')
export class ConfigCacheStatsModel {
  @Field(() => Int)
  size: number;

  @Field(() => [String])
  keys: string[];
}
