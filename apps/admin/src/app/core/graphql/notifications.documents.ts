import { graphql } from './generated/gql';

export const NotificationReceivedSubscription = graphql(`
  subscription NotificationReceived {
    notificationReceived {
      id
      title
      message
      timestamp
      userId
    }
  }
`);
