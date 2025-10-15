/**
 * 系统API Mock数据
 */

import { MockMethod } from 'vite-plugin-mock';

export default [
  // 获取系统状态
  {
    url: '/api/system/status',
    method: 'get',
    response: () => {
      return {
        success: true,
        data: {
          status: 'healthy',
          uptime: Math.floor(Math.random() * 86400) + 3600, // 1-24小时
          version: '1.0.0',
          environment: 'development',
          services: {
            database: 'connected',
            cache: 'connected',
            message_queue: 'connected',
            api_gateway: 'connected'
          },
          metrics: {
            cpu_usage: Math.floor(Math.random() * 30) + 10, // 10-40%
            memory_usage: Math.floor(Math.random() * 40) + 30, // 30-70%
            disk_usage: Math.floor(Math.random() * 20) + 40, // 40-60%
            network_io: Math.floor(Math.random() * 100) + 50 // 50-150 MB/s
          }
        },
        timestamp: Date.now(),
      };
    },
  },

  // 获取系统性能指标
  {
    url: '/api/system/performance',
    method: 'get',
    response: () => {
      const cpuUsage = Math.floor(Math.random() * 30) + 15; // 15-45%
      const memoryUsed = Math.floor(Math.random() * 40) + 40; // 40-80%
      const memoryTotal = 16384; // 16GB in MB
      const diskUsed = Math.floor(Math.random() * 20) + 40; // 40-60%
      const diskTotal = 512000; // 512GB in MB
      
      return {
        success: true,
        data: {
          cpu: {
            usage: cpuUsage,
            cores: 8,
            load: [0.5, 0.7, 0.3]
          },
          memory: {
            used: Math.floor(memoryTotal * memoryUsed / 100),
            total: memoryTotal,
            percentage: memoryUsed,
            available: Math.floor(memoryTotal * (100 - memoryUsed) / 100)
          },
          disk: {
            used: Math.floor(diskTotal * diskUsed / 100),
            total: diskTotal,
            percentage: diskUsed,
            available: Math.floor(diskTotal * (100 - diskUsed) / 100)
          },
          network: {
            incoming: Math.floor(Math.random() * 200) + 50, // 50-250 MB/s
            outgoing: Math.floor(Math.random() * 100) + 20, // 20-120 MB/s
            connections: Math.floor(Math.random() * 500) + 100
          },
          database: {
            connections: Math.floor(Math.random() * 50) + 10,
            queryTime: Math.floor(Math.random() * 100) + 50, // 50-150ms
            cacheHitRate: Math.floor(Math.random() * 20) + 80 // 80-100%
          },
          timestamp: new Date().toISOString()
        },
        timestamp: Date.now(),
      };
    },
  },

  // 系统健康检查
  {
    url: '/api/system/health',
    method: 'get',
    response: () => {
      const services = [
        'database',
        'cache', 
        'message_queue',
        'api_gateway',
        'file_storage',
        'search_engine'
      ];

      const serviceStatus = services.map(service => ({
        name: service,
        status: Math.random() > 0.1 ? 'healthy' : 'warning', // 90% healthy, 10% warning
        response_time: Math.floor(Math.random() * 50) + 10, // 10-60ms
        last_check: Date.now() - Math.floor(Math.random() * 60000), // 最近1分钟内
        details: Math.random() > 0.9 ? 'High memory usage detected' : 'Operating normally'
      }));

      const overallStatus = serviceStatus.every(s => s.status === 'healthy') ? 'healthy' : 
                           serviceStatus.some(s => s.status === 'warning') ? 'warning' : 'error';

      return {
        success: true,
        data: {
          overall_status: overallStatus,
          services: serviceStatus,
          uptime: Math.floor(Math.random() * 86400) + 3600,
          last_restart: Date.now() - Math.floor(Math.random() * 86400000), // 最近1天内
          alerts: Math.random() > 0.8 ? [
            {
              id: 'alert-001',
              level: 'warning',
              message: 'Memory usage approaching threshold',
              timestamp: Date.now() - Math.floor(Math.random() * 3600000)
            }
          ] : []
        },
        timestamp: Date.now(),
      };
    },
  },
] as MockMethod[];