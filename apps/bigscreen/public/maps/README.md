# 地图数据文件说明

## 文件列表

- `china.json` - 中国全图（包含省份边界，推荐使用）
- `china-simple.json` - 中国简化版（文件较小）

## 使用方法

在React组件中使用：

```typescript
useEffect(() => {
  fetch('/maps/china.json')
    .then(response => response.json())
    .then(geoJson => {
      echarts.registerMap('china', geoJson);
    })
    .catch(error => {
      console.error('加载地图数据失败:', error);
    });
}, []);
```

## 数据来源

- 阿里云DataV地图数据：https://datav.aliyun.com/tools/atlas
- 坐标系：GCJ-02（适合中国地区使用）

## 更新数据

运行以下命令重新下载最新数据：

```bash
node scripts/download-map-data.js
```

最后更新时间：2025/8/4 22:27:21
