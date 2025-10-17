import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { LocationData } from '@/types';
import { cn, formatNumber } from '@/utils';
import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';
import * as echarts from 'echarts';

interface LocationHeatMapProps {
  data: LocationData[];
  title?: string;
  height?: number | string;
  className?: string;
}

const logger = createLogger('LocationHeatMap');

const LocationHeatMap: React.FC<LocationHeatMapProps> = ({
  data,
  title = '地理位置分布',
  height = 0,
  className,
}) => {
  const { isDark } = useTheme();
  const [mapReady, setMapReady] = useState(false);

  // 注册详细的中国地图
  useEffect(() => {
    let cancelled = false;

    const loadChinaMap = async () => {
      try {
        // 方案一：优先使用本地详细地图数据
        const localResponse = await fetch('/maps/china.json');
        if (cancelled) return;

        if (localResponse.ok) {
          const localGeoJson = await localResponse.json();
          if (cancelled) return;
          echarts.registerMap('china', localGeoJson);
          // Local detailed map data loaded
          setMapReady(true);
          return;
        }
        throw new Error('本地文件不存在');
      } catch (localError) {
        if (cancelled) return;
        // Local map data failed, trying online source

        try {
          // 方案二：使用阿里云DataV API获取详细的中国地图数据
          const response = await fetch(
            'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'
          );
          if (cancelled) return;

          if (!response.ok) {
            throw new Error(`网络请求失败: ${response.status}`);
          }
          const geoJson = await response.json();
          if (cancelled) return;

          // 注册地图
          echarts.registerMap('china', geoJson);
          // Online map data loaded successfully
          setMapReady(true);
        } catch (onlineError) {
          if (cancelled) return;

          logger.error(
            '在线地图数据加载失败，使用简化地图:',
            onlineError instanceof Error ? onlineError : new Error(String(onlineError))
          );

          // 方案三：最后的备用方案，使用简化地图数据
          try {
            const simpleResponse = await fetch('/maps/china-simple.json');
            if (cancelled) return;

            if (simpleResponse.ok) {
              const simpleGeoJson = await simpleResponse.json();
              if (cancelled) return;
              echarts.registerMap('china', simpleGeoJson);
              // Simplified map data loaded successfully
              setMapReady(true);
              return;
            }
          } catch (simpleError) {
            if (cancelled) return;
            // Simplified map data also failed, using fallback
          }

          // 最终备用方案：使用内置的基础地图数据
          const fallbackGeoJson = {
            type: 'FeatureCollection' as const,
            features: [
              {
                type: 'Feature' as const,
                properties: { name: '中国' },
                geometry: {
                  type: 'Polygon' as const,
                  coordinates: [
                    [
                      [73.66, 53.56],
                      [134.77, 53.56],
                      [134.77, 18.16],
                      [73.66, 18.16],
                      [73.66, 53.56],
                    ],
                  ],
                },
              },
            ],
          };
          if (cancelled) return;
          echarts.registerMap('china', fallbackGeoJson);
          // Using built-in simplified map data
          setMapReady(true);
        }
      }
    };

    loadChinaMap();

    return () => {
      cancelled = true;
    };
  }, []);

  const option = React.useMemo(() => {
    // 只有在地图准备好且有数据时才生成配置
    if (!mapReady || !data.length) {
      return {
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: isDark ? '#9ca3af' : '#6b7280',
            fontSize: 14,
          },
        },
      };
    }

    // 处理数据，转换为 ECharts 需要的格式
    const processedData = data.map(item => ({
      name: item.name,
      value: [...item.coordinates, item.value],
      sentiment: item.sentiment,
    }));

    // 获取最大值用于颜色映射
    const values = data.map(item => typeof item.value === 'number' ? item.value : 0).filter(v => !isNaN(v));
    const maxValue = values.length > 0 ? Math.max(...values, 1) : 1;

    return {
      title: {
        text: title,
        left: 'center',
        top: 20,
        textStyle: {
          color: isDark ? '#ffffff' : '#111827',
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        borderRadius: 8,
        textStyle: {
          color: isDark ? '#ffffff' : '#111827',
        },
        formatter: (params: any) => {
          const item = data.find(d => d.name === params.name);
          if (!item) return '';

          const sentimentText =
            item.sentiment === 'positive'
              ? '正面'
              : item.sentiment === 'negative'
                ? '负面'
                : '中性';
          const sentimentColor = getSentimentColorHex(item.sentiment || 'neutral');

          return `
            <div style="font-weight: bold; margin-bottom: 8px;">${params.name}</div>
            <div style="margin-bottom: 4px;">
              数量: <span style="font-weight: bold;">${formatNumber(params.value[2])}</span>
            </div>
            <div style="margin-bottom: 4px;">
              坐标: <span style="font-family: monospace;">${params.value[0].toFixed(
                2
              )}, ${params.value[1].toFixed(2)}</span>
            </div>
            <div>
              情感倾向: <span style="color: ${sentimentColor}; font-weight: bold;">${sentimentText}</span>
            </div>
          `;
        },
      },
      geo: {
        map: 'china',
        roam: true,
        zoom: 1.5,
        center: [104.114129, 37.550339],
        itemStyle: {
          areaColor: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)',
          borderColor: 'transparent',
          borderWidth: 0,
        },
        emphasis: {
          itemStyle: {
            areaColor: isDark ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.4)',
            borderColor: 'transparent',
            borderWidth: 0,
          },
        },
        label: {
          show: false,
          color: isDark ? '#ffffff' : '#111827',
        },
      },
      visualMap: {
        min: 0,
        max: maxValue,
        left: 'left',
        top: 'bottom',
        text: ['高', '低'],
        textStyle: {
          color: isDark ? '#ffffff' : '#111827',
        },
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.8)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        borderRadius: 6,
        padding: [8, 12],
        inRange: {
          color: [
            '#bbf7d0',
            '#86efac',
            '#4ade80',
            '#22c55e',
            '#16a34a',
            '#15803d',
            '#166534',
            '#1e40af',
            '#1d4ed8',
            '#1e3a8a',
          ],
        },
        calculable: true,
      },
      series: [
        {
          name: '散点分布',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: processedData.map(item => ({
            name: item.name,
            value: item.value,
            symbolSize: (() => {
              const value = typeof item.value[2] === 'number' ? item.value[2] : 0;
              const ratio = maxValue > 0 ? (value / maxValue) : 0;
              const size = Math.max(8, Math.min(30, ratio * 30));
              return isNaN(size) ? 8 : size;
            })(),
            itemStyle: {
              color: getSentimentColorHex(item.sentiment || 'neutral'),
              opacity: 0.8,
            },
          })),
          symbol: 'circle',
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    };
  }, [data, title, mapReady, isDark]);

  // 获取情感对应的颜色（十六进制）
  function getSentimentColorHex(sentiment: 'positive' | 'negative' | 'neutral'): string {
    switch (sentiment) {
      case 'positive':
        return '#10b981';
      case 'negative':
        return '#ef4444';
      case 'neutral':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  }

  // 只在地图数据准备好后才渲染
  if (!mapReady) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'chart-container flex items-center justify-center bg-card/50 rounded-lg',
          className
        )}
        style={{ height: height ? `${height}px` : `100%` }}
      >
        <div className="text-center">
          <div className="relative mb-4">
            <div className="animate-spin w-12 h-12 border-3 border-muted-foreground/20 border-t-primary rounded-full mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 bg-primary/20 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="text-foreground font-medium mb-2">正在加载地图数据</div>
          <div className="text-muted-foreground text-sm">请稍候，正在获取地理位置信息...</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={cn('chart-container relative overflow-hidden rounded-lg bg-card/30', className)}
    >
      <ReactECharts
        option={option}
        style={{
          height: height ? `${height}px` : `100%`,
          width: '100%',
        }}
        opts={{ renderer: 'canvas' }}
        notMerge={false}
        lazyUpdate={false}
      />

      {/* 装饰性渐变覆盖层 */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={cn(
            'absolute inset-0 opacity-10',
            isDark
              ? 'bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/20'
              : 'bg-gradient-to-br from-blue-100/30 via-transparent to-purple-100/30'
          )}
        ></div>
      </div>
    </motion.div>
  );
};

export default LocationHeatMap;
