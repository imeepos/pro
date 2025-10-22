import { gql } from 'graphql-request';

export const WEIBO_USER_FRAGMENT = gql`
  fragment WeiboUserFragment on WeiboUser {
    id
    weiboId
    screenName
    profileImageUrl
    verified
    followersCount
    friendsCount
    statusesCount
  }
`;

export const WEIBO_POST_FRAGMENT = gql`
  fragment WeiboPostFragment on WeiboPost {
    id
    weiboId
    mid
    text
    author {
      ...WeiboUserFragment
    }
    createdAt
    repostsCount
    commentsCount
    attitudesCount
    picNum
    regionName
    source
    isLongText
    isRepost
    favorited
  }
  ${WEIBO_USER_FRAGMENT}
`;

export const WEIBO_COMMENT_FRAGMENT = gql`
  fragment WeiboCommentFragment on WeiboComment {
    id
    commentId
    text
    author {
      ...WeiboUserFragment
    }
    post {
      id
      weiboId
      text
    }
    createdAt
    likeCounts
    path
  }
  ${WEIBO_USER_FRAGMENT}
`;

export const WEIBO_INTERACTION_FRAGMENT = gql`
  fragment WeiboInteractionFragment on WeiboInteraction {
    id
    interactionType
    targetType
    userInfoSnapshot
    createdAt
    targetWeiboId
  }
`;

export const GET_POSTS_QUERY = gql`
  query GetPosts($filter: PostFilter, $pagination: Pagination, $sort: Sort) {
    posts(filter: $filter, pagination: $pagination, sort: $sort) {
      edges {
        node {
          ...WeiboPostFragment
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
  ${WEIBO_POST_FRAGMENT}
`;

export const GET_POST_QUERY = gql`
  query GetPost($id: ID!) {
    post(id: $id) {
      ...WeiboPostFragment
    }
  }
  ${WEIBO_POST_FRAGMENT}
`;

export const GET_POST_STATS_QUERY = gql`
  query GetPostStats($filter: PostFilter) {
    postStats(filter: $filter) {
      totalPosts
      totalReposts
      totalComments
      totalLikes
      averageEngagement
    }
  }
`;

export const GET_COMMENTS_QUERY = gql`
  query GetComments($filter: CommentFilter, $pagination: Pagination, $sort: Sort) {
    comments(filter: $filter, pagination: $pagination, sort: $sort) {
      edges {
        node {
          ...WeiboCommentFragment
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
  ${WEIBO_COMMENT_FRAGMENT}
`;

export const GET_COMMENT_QUERY = gql`
  query GetComment($id: ID!) {
    comment(id: $id) {
      ...WeiboCommentFragment
    }
  }
  ${WEIBO_COMMENT_FRAGMENT}
`;

export const GET_COMMENT_STATS_QUERY = gql`
  query GetCommentStats($filter: CommentFilter) {
    commentStats(filter: $filter) {
      totalComments
      totalLikes
      averageDepth
    }
  }
`;

export const GET_INTERACTIONS_QUERY = gql`
  query GetInteractions($filter: InteractionFilter, $pagination: Pagination, $sort: Sort) {
    interactions(filter: $filter, pagination: $pagination, sort: $sort) {
      edges {
        node {
          ...WeiboInteractionFragment
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
  ${WEIBO_INTERACTION_FRAGMENT}
`;

export const GET_INTERACTION_QUERY = gql`
  query GetInteraction($id: ID!) {
    interaction(id: $id) {
      ...WeiboInteractionFragment
    }
  }
  ${WEIBO_INTERACTION_FRAGMENT}
`;

export const GET_INTERACTION_STATS_QUERY = gql`
  query GetInteractionStats($filter: InteractionFilter) {
    interactionStats(filter: $filter) {
      totalInteractions
      byType {
        like
        repost
        comment
        favorite
      }
      byTarget {
        post
        comment
      }
    }
  }
`;
