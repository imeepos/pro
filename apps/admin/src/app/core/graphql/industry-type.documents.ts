import { graphql } from './generated/gql';

export const IndustryTypesDocument = graphql(`
  query IndustryTypes {
    industryTypes {
      id
      industryCode
      industryName
      description
      sortOrder
      status
      createdAt
      updatedAt
    }
  }
`);

export const IndustryTypeDocument = graphql(`
  query IndustryType($id: ID!) {
    industryType(id: $id) {
      id
      industryCode
      industryName
      description
      sortOrder
      status
      createdAt
      updatedAt
    }
  }
`);

export const CreateIndustryTypeDocument = graphql(`
  mutation CreateIndustryType($input: CreateIndustryTypeInput!) {
    createIndustryType(input: $input) {
      id
      industryCode
      industryName
      description
      sortOrder
      status
      createdAt
      updatedAt
    }
  }
`);

export const UpdateIndustryTypeDocument = graphql(`
  mutation UpdateIndustryType($id: ID!, $input: UpdateIndustryTypeInput!) {
    updateIndustryType(id: $id, input: $input) {
      id
      industryCode
      industryName
      description
      sortOrder
      status
      createdAt
      updatedAt
    }
  }
`);

export const RemoveIndustryTypeDocument = graphql(`
  mutation RemoveIndustryType($id: ID!) {
    removeIndustryType(id: $id)
  }
`);
