// BLE Mesh网络拓扑相关类型定义

export interface DeviceInfo {
  id: string;
  friendlyName: string;
  nodeType: 'ECHO' | 'NODE' | 'GATEWAY' | 'IOT_DEVICE' | 'IOT_CLOUD' | 'CLOUD' | 'APPLIANCE';
  deviceType?: string;
  firmwareVersion?: string;
  connectivity?: string;
  gatewayNodeIds?: string[];
  description?: string;
  status?: 'online' | 'offline' | 'unknown';
  lastSeen?: string;
}


// 新的拓扑数据格式（类似01.md格式）
export interface BleMeshTopologyData {
  Source: string;
  target: string;
  count: number;
  x: number;
  y: number;
  size: number;
}

export interface BleMeshTopologyConfig {
  layout: 'hierarchical' | 'force' | 'manual';
  physics: boolean;
  interaction: {
    dragNodes: boolean;
    dragView: boolean;
    zoomView: boolean;
    selectConnectedEdges: boolean;
  };
  nodeStyles: {
    echo: {
      color: string;
      shape: string;
      size: number;
    };
    node: {
      color: string;
      shape: string;
      size: number;
    };
  };
}

// API响应类型
export interface BleMeshApiResponse<T = any> {
  success: boolean;
  data: T;
  timestamp?: number;
  message?: string;
}

// 拓扑数据获取参数
export interface BleMeshQueryParams {
  customerId: string;
  type: 'reachability' | 'assignment';
  refresh?: boolean;
}