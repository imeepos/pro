import { graphql } from './generated/gql';

export const WeiboLoggedInUsersUpdateSubscription = graphql(`
  subscription WeiboLoggedInUsersUpdate {
    weiboLoggedInUsersUpdate {
      total
      todayNew
      online
    }
  }
`);
