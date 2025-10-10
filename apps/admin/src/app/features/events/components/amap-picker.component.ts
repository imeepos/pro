import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import AMapLoader from '@amap/amap-jsapi-loader';
import { ConfigService } from '../../../core/services/config.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface LocationData {
  longitude?: number | null;
  latitude?: number | null;
  address?: string | null;
}

@Component({
  selector: 'app-amap-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-3">
      <!-- 地址搜索 -->
      <div class="flex gap-2">
        <div class="flex-1 relative">
          <input
            type="text"
            [(ngModel)]="searchKeyword"
            (keyup.enter)="searchLocation()"
            placeholder="搜索地址或地点..."
            class="w-full px-3 py-2 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg class="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="button"
          (click)="searchLocation()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          搜索
        </button>
      </div>

      <!-- 地图容器 -->
      <div
        [id]="mapId"
        [style.height]="height"
        class="w-full rounded-lg border border-gray-300 bg-gray-100 relative"
      >
        <!-- 加载状态 -->
        <div *ngIf="isLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
          <div class="flex flex-col items-center gap-2">
            <div class="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <span class="text-sm text-gray-600">正在加载地图...</span>
          </div>
        </div>

        <!-- 错误状态 -->
        <div *ngIf="hasError && !isLoading" class="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div class="flex flex-col items-center gap-4 p-6 text-center">
            <svg class="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 class="text-sm font-medium text-gray-900 mb-1">地图加载失败</h3>
              <p class="text-xs text-gray-600 mb-3">{{ errorMessage }}</p>
              <button
                type="button"
                (click)="retryInitMap()"
                class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 坐标信息 -->
      <div *ngIf="selectedLocation" class="text-sm text-gray-600 space-y-1">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>经度: {{ (selectedLocation.longitude && selectedLocation.longitude.toFixed(6)) || '0.000000' }}, 纬度: {{ (selectedLocation.latitude && selectedLocation.latitude.toFixed(6)) || '0.000000' }}</span>
        </div>
        <div *ngIf="selectedLocation.address" class="flex items-start gap-2">
          <svg class="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>地址: {{ selectedLocation.address || '未知地址' }}</span>
        </div>
      </div>

      <!-- 提示信息 -->
      <div *ngIf="!mapInitialized && !isLoading && !hasError" class="text-sm text-gray-500 text-center py-4">
        地图初始化中...
      </div>
    </div>
  `,
  styles: []
})
export class AmapPickerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() longitude?: number;
  @Input() latitude?: number;
  @Input() city?: string;
  @Input() height = '400px';

  @Output() locationPick = new EventEmitter<LocationData>();

  constructor(private configService: ConfigService) {}

  mapId = `amap-picker-${Math.random().toString(36).substr(2, 9)}`;
  searchKeyword = '';
  selectedLocation?: LocationData;
  mapInitialized = false;
  isLoading = false;
  hasError = false;
  errorMessage = '';

  private map: any;
  private marker: any;
  private geocoder: any;
  private placeSearch: any;
  private AMap: any;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    if (this.longitude !== undefined && this.latitude !== undefined) {
      this.selectedLocation = {
        longitude: this.longitude,
        latitude: this.latitude
      };
    }
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.initMap();
    } catch (error) {
      console.error('地图初始化失败:', error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.map) {
      this.map.destroy();
    }
  }

  async initMap(): Promise<void> {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    try {
      // 使用异步方式获取API Key
      const amapKey = await new Promise<string>((resolve, reject) => {
        this.configService.getAmapApiKeyObservable()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (key) => {
              if (key && key !== 'YOUR_AMAP_KEY') {
                resolve(key);
              } else {
                reject(new Error('高德地图API Key未配置或无效'));
              }
            },
            error: (error) => reject(error)
          });
      });

      // 加载高德地图
      this.AMap = await AMapLoader.load({
        key: amapKey,
        version: '2.0',
        plugins: ['AMap.Geocoder', 'AMap.PlaceSearch', 'AMap.AutoComplete']
      });

      const center = this.longitude && this.latitude
        ? [this.longitude, this.latitude]
        : [116.397428, 39.90923]; // 默认北京

      this.map = new this.AMap.Map(this.mapId, {
        zoom: 13,
        center: center,
        viewMode: '3D'
      });

      this.geocoder = new this.AMap.Geocoder();
      this.placeSearch = new this.AMap.PlaceSearch({
        city: this.city || '全国'
      });

      if (this.longitude && this.latitude) {
        this.addMarker(this.longitude, this.latitude);
        await this.getAddress(this.longitude, this.latitude);
      }

      this.map.on('click', (e: any) => {
        this.onMapClick(e.lnglat.lng, e.lnglat.lat);
      });

      this.mapInitialized = true;
    } catch (error) {
      console.error('地图初始化失败:', error);
      this.hasError = true;
      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.isLoading = false;
    }
  }

  async onMapClick(lng: number, lat: number): Promise<void> {
    this.addMarker(lng, lat);
    await this.getAddress(lng, lat);
  }

  addMarker(lng: number, lat: number): void {
    if (this.marker) {
      this.marker.setPosition([lng, lat]);
    } else {
      this.marker = new this.AMap.Marker({
        position: [lng, lat],
        map: this.map,
        draggable: true
      });

      this.marker.on('dragend', (e: any) => {
        const position = e.target.getPosition();
        this.onMapClick(position.lng, position.lat);
      });
    }

    this.map.setCenter([lng, lat]);
  }

  async getAddress(lng: number, lat: number): Promise<void> {
    try {
      const result: any = await new Promise((resolve, reject) => {
        this.geocoder.getAddress([lng, lat], (status: string, data: any) => {
          if (status === 'complete' && data.info === 'OK') {
            resolve(data);
          } else {
            reject(new Error('逆地理编码失败'));
          }
        });
      });

      this.selectedLocation = {
        longitude: lng,
        latitude: lat,
        address: result.regeocode.formattedAddress
      };

      this.locationPick.emit(this.selectedLocation);
    } catch (error) {
      console.error('获取地址失败:', error);
      this.selectedLocation = {
        longitude: lng,
        latitude: lat
      };
      this.locationPick.emit(this.selectedLocation);
    }
  }

  async searchLocation(): Promise<void> {
    if (!this.searchKeyword.trim()) {
      return;
    }

    try {
      const result: any = await new Promise((resolve, reject) => {
        this.placeSearch.search(this.searchKeyword, (status: string, data: any) => {
          if (status === 'complete' && data.info === 'OK' && data.poiList.pois.length > 0) {
            resolve(data);
          } else {
            reject(new Error('搜索失败'));
          }
        });
      });

      const poi = result.poiList.pois[0];
      const lng = poi.location.lng;
      const lat = poi.location.lat;

      this.addMarker(lng, lat);
      this.selectedLocation = {
        longitude: lng,
        latitude: lat,
        address: poi.name + ' ' + poi.address
      };
      this.locationPick.emit(this.selectedLocation);
    } catch (error) {
      console.error('搜索失败:', error);
      alert('未找到相关地点，请重新搜索');
    }
  }

  /**
   * 重试初始化地图
   */
  async retryInitMap(): Promise<void> {
    if (this.map) {
      this.map.destroy();
      this.map = null;
    }

    this.mapInitialized = false;
    this.hasError = false;
    this.errorMessage = '';

    try {
      await this.initMap();
    } catch (error) {
      console.error('重试初始化地图失败:', error);
    }
  }

  /**
   * 获取用户友好的错误信息
   */
  private getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      const message = error.message;

      // 针对不同错误类型提供友好的提示
      if (message.includes('API Key') || message.includes('未配置或无效')) {
        return '地图服务配置异常，请联系管理员检查高德地图API Key配置';
      }

      if (message.includes('网络') || message.includes('Network') || message.includes('fetch')) {
        return '网络连接异常，请检查网络连接后重试';
      }

      if (message.includes('timeout')) {
        return '请求超时，请稍后重试';
      }

      return message;
    }

    return '地图加载失败，请稍后重试';
  }
}
