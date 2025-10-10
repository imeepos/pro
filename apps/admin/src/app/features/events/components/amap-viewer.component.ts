import { Component, Input, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import AMapLoader from '@amap/amap-jsapi-loader';
import { ConfigService } from '../../../core/services/config.service';

export interface EventMarker {
  id: number;
  longitude: number;
  latitude: number;
  title: string;
  description?: string;
}

@Component({
  selector: 'app-amap-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <div
        [id]="mapId"
        [style.height]="height"
        class="w-full rounded-lg border border-gray-300 bg-gray-100"
      ></div>

      <div *ngIf="!mapInitialized" class="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p class="text-sm text-gray-500">地图加载中...</p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AmapViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() longitude?: number;
  @Input() latitude?: number;
  @Input() markers: EventMarker[] = [];
  @Input() height = '400px';
  @Input() zoom = 13;
  @Input() enableClustering = false;

  constructor(private configService: ConfigService) {}

  mapId = `amap-viewer-${Math.random().toString(36).substr(2, 9)}`;
  mapInitialized = false;

  private map: any;
  private markerInstances: any[] = [];
  private cluster: any;
  private AMap: any;

  ngOnInit(): void {}

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.initMap();
    } catch (error) {
      console.error('地图初始化失败:', error);
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.destroy();
    }
  }

  async initMap(): Promise<void> {
    try {
      const amapKey = this.configService.getAmapApiKey();
      if (!this.configService.hasValidAmapKey()) {
        throw new Error('高德地图API Key未配置或无效，请检查环境变量 AMAP_API_KEY');
      }

      const plugins = ['AMap.Geocoder'];
      if (this.enableClustering) {
        plugins.push('AMap.MarkerCluster');
      }

      this.AMap = await AMapLoader.load({
        key: amapKey,
        version: '2.0',
        plugins
      });

      const center = this.longitude && this.latitude
        ? [this.longitude, this.latitude]
        : this.calculateCenter();

      this.map = new this.AMap.Map(this.mapId, {
        zoom: this.zoom,
        center: center,
        viewMode: '3D'
      });

      if (this.longitude && this.latitude) {
        this.addSingleMarker(this.longitude, this.latitude);
      }

      if (this.markers.length > 0) {
        this.addMarkers(this.markers);
      }

      this.mapInitialized = true;
    } catch (error) {
      console.error('地图初始化失败:', error);
      throw error;
    }
  }

  addSingleMarker(lng: number, lat: number): void {
    const marker = new this.AMap.Marker({
      position: [lng, lat],
      map: this.map,
      icon: this.createMarkerIcon('#3b82f6')
    });
    this.markerInstances.push(marker);
  }

  addMarkers(markers: EventMarker[]): void {
    this.clearMarkers();

    if (this.enableClustering && markers.length > 10) {
      this.addClusteredMarkers(markers);
    } else {
      markers.forEach(marker => {
        this.addEventMarker(marker);
      });
    }

    if (markers.length > 1) {
      this.fitToMarkers();
    }
  }

  addEventMarker(eventMarker: EventMarker): void {
    const marker = new this.AMap.Marker({
      position: [eventMarker.longitude, eventMarker.latitude],
      map: this.map,
      icon: this.createMarkerIcon('#ef4444'),
      title: eventMarker.title
    });

    const infoWindow = new this.AMap.InfoWindow({
      content: this.createInfoWindowContent(eventMarker),
      offset: new this.AMap.Pixel(0, -30)
    });

    marker.on('click', () => {
      infoWindow.open(this.map, marker.getPosition());
    });

    this.markerInstances.push(marker);
  }

  addClusteredMarkers(markers: EventMarker[]): void {
    const markerData = markers.map(m => ({
      lnglat: [m.longitude, m.latitude],
      weight: 1,
      data: m
    }));

    this.cluster = new this.AMap.MarkerCluster(this.map, markerData, {
      gridSize: 80,
      renderClusterMarker: this.renderClusterMarker.bind(this),
      renderMarker: this.renderMarker.bind(this)
    });
  }

  renderClusterMarker(context: any): void {
    const count = context.count;
    const div = document.createElement('div');
    div.style.cssText = `
      background-color: rgba(239, 68, 68, 0.9);
      color: white;
      border: 2px solid white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    `;
    div.innerText = count.toString();
    context.marker.setContent(div);
  }

  renderMarker(context: any): void {
    const marker = context.marker;
    const data = context.data[0].data;
    marker.setIcon(this.createMarkerIcon('#ef4444'));
    marker.setTitle(data.title);

    const infoWindow = new this.AMap.InfoWindow({
      content: this.createInfoWindowContent(data),
      offset: new this.AMap.Pixel(0, -30)
    });

    marker.on('click', () => {
      infoWindow.open(this.map, marker.getPosition());
    });
  }

  createMarkerIcon(color: string): any {
    return new this.AMap.Icon({
      size: new this.AMap.Size(32, 32),
      image: `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `)}`,
      imageSize: new this.AMap.Size(32, 32)
    });
  }

  createInfoWindowContent(marker: EventMarker): string {
    return `
      <div style="padding: 10px; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
          ${this.escapeHtml(marker.title)}
        </h3>
        ${marker.description ? `
          <p style="margin: 0; font-size: 12px; color: #6b7280;">
            ${this.escapeHtml(marker.description)}
          </p>
        ` : ''}
      </div>
    `;
  }

  clearMarkers(): void {
    this.markerInstances.forEach(marker => {
      marker.setMap(null);
    });
    this.markerInstances = [];

    if (this.cluster) {
      this.cluster.setMap(null);
      this.cluster = null;
    }
  }

  calculateCenter(): [number, number] {
    if (this.markers.length === 0) {
      return [116.397428, 39.90923]; // 默认北京
    }

    const avgLng = this.markers.reduce((sum, m) => sum + m.longitude, 0) / this.markers.length;
    const avgLat = this.markers.reduce((sum, m) => sum + m.latitude, 0) / this.markers.length;
    return [avgLng, avgLat];
  }

  fitToMarkers(): void {
    if (this.markers.length === 0) return;

    const bounds = new this.AMap.Bounds(
      [
        Math.min(...this.markers.map(m => m.longitude)),
        Math.min(...this.markers.map(m => m.latitude))
      ],
      [
        Math.max(...this.markers.map(m => m.longitude)),
        Math.max(...this.markers.map(m => m.latitude))
      ]
    );

    this.map.setBounds(bounds);
  }

  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
