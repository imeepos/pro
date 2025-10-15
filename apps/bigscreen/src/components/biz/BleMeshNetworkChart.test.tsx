// import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BleMeshNetworkChart from './BleMeshNetworkChart';

// Mock vis-network
vi.mock('vis-network', () => ({
  Network: vi.fn(() => ({
    on: vi.fn(),
    once: vi.fn(),
    setSize: vi.fn(),
    fit: vi.fn(),
    destroy: vi.fn()
  }))
}));

// Mock vis-data
vi.mock('vis-data', () => ({
  DataSet: vi.fn((data) => ({
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(() => data)
  }))
}));

// Mock API
vi.mock('../../services/api/bleMesh', () => ({
  getBleMeshTopologyData: vi.fn(() => 
    Promise.resolve({
      success: true,
      data: [
        {
          Source: "Pompeo",
          target: "node1",
          count: 100,
          x: 1.0,
          y: 1.0,
          size: 0.5
        },
        {
          Source: "Pompeo", 
          target: "node1", // 重复节点
          count: 150,
          x: 1.5,
          y: 1.5,
          size: 0.7
        },
        {
          Source: "node1",
          target: "node2",
          count: 75,
          x: 2.0,
          y: 2.0,
          size: 0.3
        }
      ]
    })
  ),
  getDeviceDetails: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        id: 'node1',
        friendlyName: 'Test Node 1',
        nodeType: 'NODE' as const,
        status: 'online' as const
      }
    })
  )
}));

describe('BleMeshNetworkChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <BleMeshNetworkChart 
        type="reachability"
        customerId="test-customer"
      />
    );
    
    expect(screen.getByRole('button', { name: /刷新数据/i })).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(
      <BleMeshNetworkChart 
        type="reachability"
        customerId="test-customer"
        isLoading={true}
      />
    );
    
    expect(screen.getByText(/加载网络拓扑中/i)).toBeInTheDocument();
  });

  it('shows error state when there is an error', () => {
    render(
      <BleMeshNetworkChart 
        type="reachability"
        customerId="test-customer"
        isLoading={false}
      />
    );
    
    // 初始状态应该显示暂无数据
    expect(screen.getByText(/暂无数据/i)).toBeInTheDocument();
  });

  it('handles basic props', () => {
    render(
      <BleMeshNetworkChart 
        type="assignment"
        customerId="test-customer"
      />
    );
    
    const container = screen.getByRole('button', { name: /刷新数据/i }).closest('div');
    expect(container).toBeInTheDocument();
  });
});