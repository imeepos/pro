import { apiClient } from './client';
import { 
  BleMeshApiResponse, 
  BleMeshTopologyData,
  BleMeshQueryParams,
  DeviceInfo 
} from '../../types/bleMesh';

/**
 * 获取BLE Mesh拓扑数据
 */
export const getBleMeshTopologyData = async (
  params: BleMeshQueryParams
): Promise<BleMeshApiResponse<BleMeshTopologyData[]>> => {
  try {
    const response = await apiClient.get('/api/ble-mesh/topology', {
      params: {
        customerId: params.customerId,
        type: params.type,
        refresh: params.refresh || false
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('获取BLE Mesh拓扑数据失败:', error);
    throw error;
  }
};

/**
 * 获取设备详细信息
 */
export const getDeviceDetails = async (
  deviceId: string
): Promise<BleMeshApiResponse<DeviceInfo>> => {
  try {
    const response = await apiClient.get(`/api/ble-mesh/device/${deviceId}`);
    return response.data;
  } catch (error) {
    console.error('获取设备详细信息失败:', error);
    throw error;
  }
};

/**
 * 刷新拓扑数据
 */
export const refreshTopologyData = async (
  customerId: string,
  type: 'reachability' | 'assignment'
): Promise<BleMeshApiResponse<BleMeshTopologyData[]>> => {
  try {
    const response = await apiClient.post('/api/ble-mesh/refresh', {
      customerId,
      type
    });
    return response.data;
  } catch (error) {
    console.error('刷新拓扑数据失败:', error);
    throw error;
  }
};

/**
 * 搜索客户设备
 */
export const searchCustomerDevices = async (
  customerId: string
): Promise<BleMeshApiResponse<{ reachability: BleMeshTopologyData[]; assignment: BleMeshTopologyData[] }>> => {
  try {
    const response = await apiClient.get(`/api/ble-mesh/customer/${customerId}`);
    return response.data;
  } catch (error) {
    console.error('搜索客户设备失败:', error);
    throw error;
  }
};