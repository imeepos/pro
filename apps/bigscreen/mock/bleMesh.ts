import { MockMethod } from 'vite-plugin-mock';
import { DeviceInfo } from '../src/types/bleMesh';
import { networkData } from '../complete_data';

// 模拟设备详细信息
const deviceDetails: Record<string, DeviceInfo> = {
  'echo1': {
    id: 'echo1',
    friendlyName: 'Echo Hub 1',
    nodeType: 'ECHO',
    deviceType: 'BLE Gateway',
    firmwareVersion: '1.2.3',
    status: 'online',
    lastSeen: new Date().toISOString()
  },
  'echo2': {
    id: 'echo2',
    friendlyName: 'Echo Hub 2',
    nodeType: 'ECHO',
    deviceType: 'BLE Gateway',
    firmwareVersion: '1.2.3',
    status: 'online',
    lastSeen: new Date().toISOString()
  },
  'echo3': {
    id: 'echo3',
    friendlyName: 'Echo Hub 3',
    nodeType: 'ECHO',
    deviceType: 'BLE Gateway',
    firmwareVersion: '1.2.1',
    status: 'offline',
    lastSeen: new Date(Date.now() - 300000).toISOString() // 5分钟前
  },
  'node1': {
    id: 'node1',
    friendlyName: 'Smart Sensor 1',
    nodeType: 'NODE',
    deviceType: 'Temperature Sensor',
    connectivity: 'BLE Mesh',
    gatewayNodeIds: ['echo1', 'echo3'],
    status: 'online',
    lastSeen: new Date().toISOString()
  },
  'node2': {
    id: 'node2',
    friendlyName: 'Smart Light 1',
    nodeType: 'NODE',
    deviceType: 'LED Controller',
    connectivity: 'BLE Mesh',
    gatewayNodeIds: ['echo1', 'echo2'],
    status: 'online',
    lastSeen: new Date().toISOString()
  },
  'node3': {
    id: 'node3',
    friendlyName: 'Motion Detector',
    nodeType: 'NODE',
    deviceType: 'PIR Sensor',
    connectivity: 'BLE Mesh',
    gatewayNodeIds: ['echo2'],
    status: 'online',
    lastSeen: new Date().toISOString()
  },
  'node4': {
    id: 'node4',
    friendlyName: 'Smart Switch 1',
    nodeType: 'NODE',
    deviceType: 'Wall Switch',
    connectivity: 'BLE Mesh',
    gatewayNodeIds: ['node1', 'node2'],
    status: 'online',
    lastSeen: new Date().toISOString()
  },
  'node5': {
    id: 'node5',
    friendlyName: 'Door Sensor',
    nodeType: 'NODE',
    deviceType: 'Contact Sensor',
    connectivity: 'BLE Mesh',
    gatewayNodeIds: ['echo3'],
    status: 'offline',
    lastSeen: new Date(Date.now() - 180000).toISOString() // 3分钟前
  }
};

export default [
  // 获取拓扑数据
  {
    url: '/api/ble-mesh/topology',
    method: 'get',
    response: () => {
      // 返回01.md中的数据，进行严格的类型检查和边界处理
      const safeNetworkData = networkData.map(item => {
        // 确保所有必需的字段都存在且类型正确
        const safeItem = {
          Source: typeof item.Source === 'string' ? item.Source : '',
          target: typeof item.target === 'string' ? item.target : '',
          count: typeof item.count === 'number' && !isNaN(item.count) ? item.count : 0,
          x: (() => {
            if (typeof item.x === 'number' && !isNaN(item.x)) return item.x;
            if (typeof item.x === 'string' && item.x !== '') {
              const parsed = parseFloat(item.x);
              return !isNaN(parsed) ? parsed : 0;
            }
            return 0;
          })(),
          y: (() => {
            if (typeof item.y === 'number' && !isNaN(item.y)) return item.y;
            if (typeof item.y === 'string' && item.y !== '') {
              const parsed = parseFloat(item.y);
              return !isNaN(parsed) ? parsed : 0;
            }
            return 0;
          })(),
          size: (() => {
            if (typeof item.size === 'number' && !isNaN(item.size)) return item.size;
            if (typeof item.size === 'string' && item.size !== '') {
              const parsed = parseFloat(item.size);
              return !isNaN(parsed) ? parsed : 0;
            }
            return 0;
          })()
        };
        
        return safeItem;
      }).filter(item => 
        // 过滤掉无效的数据项
        item.Source && item.target && typeof item.count === 'number'
      );
      
      return {
        success: true,
        data: safeNetworkData,
        timestamp: Date.now()
      };
    }
  },
  
  // 获取设备详细信息
  {
    url: '/api/ble-mesh/device/:deviceId',
    method: 'get',
    response: (req: any) => {
      const { query, url } = req;
      // 从URL路径中提取deviceId
      const deviceId = url.split('/').pop() || query?.deviceId;
      
      if (!deviceId || typeof deviceId !== 'string') {
        return {
          success: false,
          message: 'Device ID is required',
          timestamp: Date.now()
        };
      }
      
      const device = deviceDetails[deviceId];
      
      if (!device) {
        return {
          success: false,
          message: 'Device not found',
          timestamp: Date.now()
        };
      }
      
      return {
        success: true,
        data: device,
        timestamp: Date.now()
      };
    }
  },
  
  // 刷新拓扑数据
  {
    url: '/api/ble-mesh/refresh',
    method: 'post',
    response: (req: any) => {
      const { body } = req;
      const { customerId, type } = body || {};
      
      if (!customerId || typeof customerId !== 'string') {
        return {
          success: false,
          message: 'Customer ID is required',
          timestamp: Date.now()
        };
      }
      
      if (!type || !['reachability', 'assignment'].includes(type)) {
        return {
          success: false,
          message: 'Invalid topology type',
          timestamp: Date.now()
        };
      }
      
      // 直接返回完整数据，确保类型安全
      const safeNetworkData = networkData.map(item => ({
        Source: typeof item.Source === 'string' ? item.Source : '',
        target: typeof item.target === 'string' ? item.target : '',
        count: typeof item.count === 'number' && !isNaN(item.count) ? item.count : 0,
        x: typeof item.x === 'number' && !isNaN(item.x) ? item.x : parseFloat(String(item.x)) || 0,
        y: typeof item.y === 'number' && !isNaN(item.y) ? item.y : parseFloat(String(item.y)) || 0,
        size: typeof item.size === 'number' && !isNaN(item.size) ? item.size : parseFloat(String(item.size)) || 0
      })).filter(item => item.Source && item.target);
      
      return {
        success: true,
        data: safeNetworkData,
        timestamp: Date.now()
      };
    }
  },
  
  // 搜索客户设备
  {
    url: '/api/ble-mesh/customer/:customerId',
    method: 'get',
    response: (req: any) => {
      const { query, url } = req;
      // 从URL路径中提取customerId
      const customerId = url.split('/').pop() || query?.customerId;
      
      if (!customerId || typeof customerId !== 'string') {
        return {
          success: false,
          message: 'Customer ID is required',
          timestamp: Date.now()
        };
      }
      
      // 返回网络数据的一部分作为示例
      const reachabilityData = networkData.slice(0, 100);
      const assignmentData = networkData.slice(100, 200);
      
      return {
        success: true,
        data: {
          reachability: reachabilityData,
          assignment: assignmentData
        },
        timestamp: Date.now()
      };
    }
  }
] as MockMethod[];