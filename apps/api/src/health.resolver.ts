import { Query, Resolver, ObjectType, Field } from '@nestjs/graphql';

@ObjectType('HealthStatus')
class HealthStatusModel {
  @Field(() => String)
  status: string;

  @Field(() => Date)
  timestamp: Date;
}

@Resolver(() => HealthStatusModel)
export class HealthResolver {
  @Query(() => HealthStatusModel, { name: 'health' })
  getHealth(): HealthStatusModel {
    return {
      status: 'healthy',
      timestamp: new Date(),
    };
  }
}
