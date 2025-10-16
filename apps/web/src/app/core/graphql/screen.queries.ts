export const PUBLISHED_SCREENS_QUERY = /* GraphQL */ `
  query PublishedScreens($page: Int, $limit: Int) {
    publishedScreens(page: $page, limit: $limit) {
      edges {
        node {
          id
          name
          description
          layout
          components
          status
          isDefault
          createdBy
          createdAt
          updatedAt
        }
      }
      totalCount
    }
  }
`;

export const DEFAULT_SCREEN_QUERY = /* GraphQL */ `
  query DefaultScreen {
    defaultScreen {
      id
      name
      description
      layout
      components
      status
      isDefault
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const SCREEN_QUERY = /* GraphQL */ `
  query Screen($id: ID!) {
    screen(id: $id) {
      id
      name
      description
      layout
      components
      status
      isDefault
      createdBy
      createdAt
      updatedAt
    }
  }
`;
