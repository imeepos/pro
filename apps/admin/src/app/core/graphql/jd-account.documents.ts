import { graphql } from './generated';

export const JdAccountsQuery = graphql(`
  query JdAccounts($filter: JdAccountFilterInput) {
    jdAccounts(filter: $filter) {
      edges {
        node {
          id
          jdUid
          jdNickname
          jdAvatar
          status
          lastCheckAt
          createdAt
        }
      }
      totalCount
    }
  }
`);

export const RemoveJdAccountMutation = graphql(`
  mutation RemoveJdAccount($id: Int!) {
    removeJdAccount(id: $id)
  }
`);

export const CheckJdAccountMutation = graphql(`
  mutation CheckJdAccount($id: Int!) {
    checkJdAccount(id: $id) {
      accountId
      jdUid
      oldStatus
      newStatus
      statusChanged
      message
      checkedAt
    }
  }
`);

export const StartJdLoginMutation = graphql(`
  mutation StartJdLogin {
    startJdLogin {
      sessionId
      expiresAt
      expired
    }
  }
`);

export const JdLoginEventsSubscription = graphql(`
  subscription JdLoginEvents($sessionId: String!) {
    jdLoginEvents(sessionId: $sessionId) {
      type
      data
    }
  }
`);
