import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { IndustryTypeService } from './industry-type.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateIndustryTypeDto, UpdateIndustryTypeDto } from './dto/industry-type.dto';
import { IndustryTypeModel, mapIndustryTypeEntityToModel } from './models/industry-type.model';

@Resolver(() => IndustryTypeModel)
@UseGuards(JwtAuthGuard)
export class IndustryTypeResolver {
  constructor(private readonly industryTypeService: IndustryTypeService) {}

  @Query(() => [IndustryTypeModel], { name: 'industryTypes' })
  async findAll(): Promise<IndustryTypeModel[]> {
    const types = await this.industryTypeService.findAll();
    return types.map(mapIndustryTypeEntityToModel);
  }

  @Query(() => IndustryTypeModel, { name: 'industryType' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<IndustryTypeModel> {
    const type = await this.industryTypeService.findOne(id);
    return mapIndustryTypeEntityToModel(type);
  }

  @Mutation(() => IndustryTypeModel, { name: 'createIndustryType' })
  async create(
    @Args('input', { type: () => CreateIndustryTypeDto }) input: CreateIndustryTypeDto,
  ): Promise<IndustryTypeModel> {
    const type = await this.industryTypeService.create(input);
    return mapIndustryTypeEntityToModel(type);
  }

  @Mutation(() => IndustryTypeModel, { name: 'updateIndustryType' })
  async update(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => UpdateIndustryTypeDto }) input: UpdateIndustryTypeDto,
  ): Promise<IndustryTypeModel> {
    const type = await this.industryTypeService.update(id, input);
    return mapIndustryTypeEntityToModel(type);
  }

  @Mutation(() => Boolean, { name: 'removeIndustryType' })
  async remove(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    await this.industryTypeService.remove(id);
    return true;
  }
}
