import { graphql } from './generated';

export const WeiboAccountsQuery = graphql(`
  query WeiboAccounts($filter: WeiboAccountFilterInput) {
    weiboAccounts(filter: $filter) {
      edges {
        node {
          id
          uid
          nickname
          avatar
          status
          lastCheckAt
          createdAt
          updatedAt
        }
      }
      totalCount
    }
  }
`);

export const RemoveWeiboAccountMutation = graphql(`
  mutation RemoveWeiboAccount($id: Int!) {
    removeWeiboAccount(id: $id)
  }
`);

export const CheckWeiboAccountMutation = graphql(`
  mutation CheckWeiboAccount($id: Int!) {
    checkWeiboAccount(id: $id)
  }
`);

export const StartWeiboLoginMutation = graphql(`
  mutation StartWeiboLogin {
    startWeiboLogin {
      sessionId
      expiresAt
      expired
    }
  }
`);

export const WeiboLoginEventsSubscription = graphql(`
  subscription WeiboLoginEvents($sessionId: String!) {
    weiboLoginEvents(sessionId: $sessionId) {
      type
      data
    }
  }
`);
