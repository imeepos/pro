import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

@InputType('CreateEventTypeInput')
export class CreateEventTypeDto {
  @IsString()
  @MaxLength(50)
  @Field(() => String)
  eventCode: string;

  @IsString()
  @MaxLength(100)
  @Field(() => String)
  eventName: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Field(() => Int, { nullable: true })
  sortOrder?: number;

  @IsOptional()
  @IsIn([0, 1])
  @Field(() => Int, { nullable: true })
  status?: number;
}

@InputType('UpdateEventTypeInput')
export class UpdateEventTypeDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Field(() => String, { nullable: true })
  eventCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Field(() => String, { nullable: true })
  eventName?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Field(() => Int, { nullable: true })
  sortOrder?: number;

  @IsOptional()
  @IsIn([0, 1])
  @Field(() => Int, { nullable: true })
  status?: number;
}
