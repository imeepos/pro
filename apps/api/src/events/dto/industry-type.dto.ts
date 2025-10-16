import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

@InputType('CreateIndustryTypeInput')
export class CreateIndustryTypeDto {
  @IsString()
  @MaxLength(50)
  @Field(() => String)
  industryCode: string;

  @IsString()
  @MaxLength(100)
  @Field(() => String)
  industryName: string;

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

@InputType('UpdateIndustryTypeInput')
export class UpdateIndustryTypeDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Field(() => String, { nullable: true })
  industryCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Field(() => String, { nullable: true })
  industryName?: string;

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
