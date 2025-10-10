export enum EventType {
  COMPONENT_CLICK = 'componentClick',
  COMPONENT_HOVER = 'componentHover',
  COMPONENT_LEAVE = 'componentLeave',
  DATA_CHANGE = 'dataChange',
  CUSTOM = 'custom'
}

export enum EventActionType {
  SHOW = 'show',
  HIDE = 'hide',
  TOGGLE_VISIBILITY = 'toggleVisibility',
  UPDATE_DATA = 'updateData',
  NAVIGATE = 'navigate',
  CUSTOM_SCRIPT = 'customScript'
}

export interface EventAction {
  type: EventActionType;
  targetComponentId?: string;
  params?: Record<string, any>;
  script?: string;
  condition?: string;
}

export interface ComponentEvent {
  id: string;
  type: EventType;
  trigger: string;
  actions: EventAction[];
  enabled?: boolean;
  description?: string;
}

export interface Event {
  id: string;
  type: EventType;
  sourceComponentId: string;
  targetComponentId?: string;
  actionType: EventActionType;
  params?: Record<string, any>;
  timestamp: number;
}

export interface EventHistory {
  event: Event;
  success: boolean;
  error?: string;
  timestamp: number;
}
