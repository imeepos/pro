import { User, UserStatus } from '@pro/types';
import { UserStatus as GqlUserStatus } from '../graphql/generated/graphql';

type GraphqlUserLike = {
  id: string;
  username: string;
  email: string;
  status: GqlUserStatus;
  createdAt: string;
  updatedAt: string;
};

export function toDomainUser(user: GraphqlUserLike): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    status: toDomainUserStatus(user.status),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export function toDomainUserStatus(status: GqlUserStatus): UserStatus {
  switch (status) {
    case GqlUserStatus.Active:
      return UserStatus.ACTIVE;
    case GqlUserStatus.Inactive:
      return UserStatus.INACTIVE;
    case GqlUserStatus.Suspended:
      return UserStatus.SUSPENDED;
    default:
      return UserStatus.INACTIVE;
  }
}

export function toGraphqlUserStatus(status?: UserStatus): GqlUserStatus | undefined {
  if (!status) {
    return undefined;
  }

  switch (status) {
    case UserStatus.ACTIVE:
      return GqlUserStatus.Active;
    case UserStatus.INACTIVE:
      return GqlUserStatus.Inactive;
    case UserStatus.SUSPENDED:
      return GqlUserStatus.Suspended;
    default:
      return undefined;
  }
}
