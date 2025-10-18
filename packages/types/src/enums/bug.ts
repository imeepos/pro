export enum BugStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REJECTED = 'REJECTED',
  REOPENED = 'REOPENED'
}

export enum BugPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum BugCategory {
  FUNCTIONAL = 'functional',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  UI_UX = 'ui_ux',
  INTEGRATION = 'integration',
  DATA = 'data',
  CONFIGURATION = 'configuration',
  DOCUMENTATION = 'documentation'
}

export enum BugActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
  ASSIGNED = 'assigned',
  STATUS_CHANGED = 'status_changed',
  PRIORITY_CHANGED = 'priority_changed',
  COMMENT_ADDED = 'comment_added',
  ATTACHMENT_ADDED = 'attachment_added',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REOPENED = 'reopened',
  WATCHER_ADDED = 'watcher_added',
  WATCHER_REMOVED = 'watcher_removed',
  TAG_ADDED = 'tag_added',
  TAG_REMOVED = 'tag_removed'
}

export enum BugNotificationType {
  ASSIGNED = 'assigned',
  STATUS_CHANGED = 'status_changed',
  COMMENT_ADDED = 'comment_added',
  MENTION = 'mention',
  DUE_DATE_REMINDER = 'due_date_reminder',
  BUG_RESOLVED = 'bug_resolved',
  BUG_CLOSED = 'bug_closed',
  BUG_REOPENED = 'bug_reopened'
}
