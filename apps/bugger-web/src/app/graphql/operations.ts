import { gql } from 'apollo-angular';

export const BUG_FRAGMENT = gql`
  fragment BugFields on BugModel {
    id
    title
    description
    status
    priority
    category
    stepsToReproduce
    expectedBehavior
    actualBehavior
    reproductionRate
    environment
    reporterId
    assigneeId
    dueDate
    estimatedHours
    actualHours
    createdAt
    updatedAt
  }
`;

export const BUG_COMMENT_FRAGMENT = gql`
  fragment BugCommentFields on BugCommentModel {
    id
    bugId
    authorId
    authorName
    content
    createdAt
    updatedAt
  }
`;

export const GET_BUGS = gql`
  ${BUG_FRAGMENT}
  query GetBugs($filters: BugFiltersInput) {
    bugs(filters: $filters) {
      bugs {
        ...BugFields
        comments {
          id
        }
        attachments {
          id
        }
      }
      total
    }
  }
`;

export const GET_BUG = gql`
  ${BUG_FRAGMENT}
  ${BUG_COMMENT_FRAGMENT}
  query GetBug($id: ID!) {
    bug(id: $id) {
      ...BugFields
      comments {
        ...BugCommentFields
      }
      attachments {
        id
        filename
        originalFilename
        mimetype
        size
        uploadedBy
        uploadedAt
      }
    }
  }
`;

export const GET_BUG_STATISTICS = gql`
  query GetBugStatistics {
    bugStatistics {
      total
      byStatus {
        open
        in_progress
        resolved
        closed
        rejected
        reopened
      }
      byPriority {
        low
        medium
        high
        critical
      }
      byCategory {
        functional
        performance
        security
        ui_ux
        integration
        data
        configuration
        documentation
      }
    }
  }
`;

export const CREATE_BUG = gql`
  ${BUG_FRAGMENT}
  mutation CreateBug($input: CreateBugInput!) {
    createBug(input: $input) {
      ...BugFields
    }
  }
`;

export const UPDATE_BUG = gql`
  ${BUG_FRAGMENT}
  mutation UpdateBug($id: ID!, $input: UpdateBugInput!) {
    updateBug(id: $id, input: $input) {
      ...BugFields
    }
  }
`;

export const REMOVE_BUG = gql`
  mutation RemoveBug($id: ID!) {
    removeBug(id: $id)
  }
`;

export const UPDATE_BUG_STATUS = gql`
  ${BUG_FRAGMENT}
  mutation UpdateBugStatus($id: ID!, $input: UpdateBugStatusInput!) {
    updateBugStatus(id: $id, input: $input) {
      ...BugFields
    }
  }
`;

export const ASSIGN_BUG = gql`
  ${BUG_FRAGMENT}
  mutation AssignBug($id: ID!, $input: AssignBugInput!) {
    assignBug(id: $id, input: $input) {
      ...BugFields
    }
  }
`;

export const GET_BUG_COMMENTS = gql`
  ${BUG_COMMENT_FRAGMENT}
  query GetBugComments($bugId: ID!) {
    bugComments(bugId: $bugId) {
      ...BugCommentFields
    }
  }
`;

export const ADD_BUG_COMMENT = gql`
  ${BUG_COMMENT_FRAGMENT}
  mutation AddBugComment($bugId: ID!, $input: CreateBugCommentInput!) {
    addBugComment(bugId: $bugId, input: $input) {
      ...BugCommentFields
    }
  }
`;
