export enum DataMode {
  SELF = 'SELF',
  API = 'API',
  WEBSOCKET = 'WEBSOCKET',
  GLOBAL = 'GLOBAL'
}

export enum DataSourceType {
  DEMO = 'DEMO',
  STATIC = 'STATIC',
  API = 'API',
  WEBSOCKET = 'WEBSOCKET',
  GLOBAL = 'GLOBAL'
}

export enum RequestMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

export enum DataStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
