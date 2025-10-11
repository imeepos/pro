/**
 * 任务统计接口
 */
export interface TaskStats {
  total: number;
  enabled: number;
  running: number;
  pending: number;
  failed: number;
  paused: number;
}