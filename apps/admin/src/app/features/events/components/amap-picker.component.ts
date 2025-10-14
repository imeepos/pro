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
      <div class="space-y-2">
        <div class="flex gap-2">
          <div class="flex-1 relative">
            <input
              type="text"
              [(ngModel)]="searchKeyword"
              (keyup.enter)="searchLocation()"
              (input)="searchError = ''"
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

        <!-- 搜索错误提示 -->
        <div *ngIf="searchError" class="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div class="flex-1">
            <div class="whitespace-pre-line">{{ searchError }}</div>
          </div>
          <button
            type="button"
            (click)="searchError = ''"
            class="text-red-500 hover:text-red-700 flex-shrink-0"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
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
          <div class="flex flex-col items-center gap-4 p-6 text-center max-w-sm">
            <svg class="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 class="text-sm font-medium text-gray-900 mb-1">地图服务异常</h3>
              <p class="text-xs text-gray-600 mb-3 leading-relaxed">{{ errorMessage }}</p>

              <!-- 错误类型提示 -->
              <div class="mb-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                <ng-container *ngIf="errorMessage.includes('API Key')">
                  💡 需要管理员配置高德地图API Key
                </ng-container>
                <ng-container *ngIf="errorMessage.includes('网络')">
                  💡 请检查网络连接
                </ng-container>
                <ng-container *ngIf="errorMessage.includes('配额')">
                  💡 API调用次数已达上限
                </ng-container>
                <ng-container *ngIf="!errorMessage.includes('API Key') && !errorMessage.includes('网络') && !errorMessage.includes('配额')">
                  💡 可能是临时服务问题
                </ng-container>
              </div>

              <div class="flex gap-2 justify-center">
                <button
                  type="button"
                  (click)="retryInitMap()"
                  class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  重试
                </button>
                <button
                  type="button"
                  (click)="clearCacheAndRetry()"
                  class="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  清除缓存重试
                </button>
              </div>
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
  searchError = '';

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
      console.log('开始初始化地图...');

      // 使用异步方式获取API Key
      const amapKey = await new Promise<string>((resolve, reject) => {
        console.log('正在获取高德地图API Key...');

        this.configService.getAmapApiKeyObservable()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (key) => {
              console.log('获取到API Key:', key ? `${key.substring(0, 8)}...` : 'null');

              if (key && key !== 'YOUR_AMAP_KEY') {
                resolve(key);
              } else {
                reject(new Error('高德地图API Key未配置或无效，请联系管理员配置有效的API Key'));
              }
            },
            error: (error) => {
              console.error('获取API Key失败:', error);
              reject(new Error(`获取API Key失败: ${error.message}`));
            }
          });
      });

      console.log('开始加载高德地图JS API...');

      // 加载高德地图
      this.AMap = await AMapLoader.load({
        key: amapKey,
        version: '2.0',
        plugins: ['AMap.Geocoder', 'AMap.PlaceSearch', 'AMap.AutoComplete']
      });

      console.log('高德地图JS API加载成功');

      const center = this.longitude && this.latitude
        ? [this.longitude, this.latitude]
        : [116.397428, 39.90923]; // 默认北京

      console.log('创建地图实例，中心点:', center);

      this.map = new this.AMap.Map(this.mapId, {
        zoom: 13,
        center: center,
        viewMode: '3D'
      });

      console.log('地图实例创建成功');

      // 初始化地理编码服务
      this.geocoder = new this.AMap.Geocoder();
      console.log('逆地理编码服务初始化成功');

      this.placeSearch = new this.AMap.PlaceSearch({
        city: this.city || '全国'
      });
      console.log('地点搜索服务初始化成功');

      if (this.longitude && this.latitude) {
        console.log('添加初始标记点:', { longitude: this.longitude, latitude: this.latitude });
        this.addMarker(this.longitude, this.latitude);
        await this.getAddress(this.longitude, this.latitude);
      }

      this.map.on('click', (e: any) => {
        console.log('地图点击事件:', e.lnglat);
        this.onMapClick(e.lnglat.lng, e.lnglat.lat);
      });

      this.mapInitialized = true;
      console.log('地图初始化完成');
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
    const maxRetries = 3;
    let retryCount = 0;

    const attemptGeocoding = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        this.geocoder.getAddress([lng, lat], (status: string, data: any) => {
          console.log('逆地理编码响应:', { status, info: data?.info, lng, lat });

          if (status === 'complete' && data.info === 'OK') {
            resolve(data);
          } else {
            const errorDetails = {
              status,
              info: data?.info,
              message: data?.message,
              lng,
              lat,
              retryCount
            };
            console.error('逆地理编码失败详情:', errorDetails);
            reject(new Error(this.getGeocoderErrorMessage(data)));
          }
        });
      });
    };

    while (retryCount < maxRetries) {
      try {
        const result = await attemptGeocoding();

        this.selectedLocation = {
          longitude: lng,
          latitude: lat,
          address: result.regeocode.formattedAddress
        };

        console.log('逆地理编码成功:', this.selectedLocation);
        this.locationPick.emit(this.selectedLocation);
        return;
      } catch (error) {
        retryCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`第${retryCount}次逆地理编码失败:`, errorMessage);

        if (retryCount < maxRetries) {
          // 指数退避重试
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('逆地理编码最终失败，使用坐标位置:', { lng, lat, error: errorMessage });

          // 降级处理：即使没有地址信息，也提供坐标
          this.selectedLocation = {
            longitude: lng,
            latitude: lat,
            address: `坐标位置: ${lng.toFixed(6)}, ${lat.toFixed(6)}`
          };

          this.locationPick.emit(this.selectedLocation);
        }
      }
    }
  }

  /**
   * 根据高德API响应获取详细的错误信息（逆地理编码）
   */
  private getGeocoderErrorMessage(data: any): string {
    if (!data) return '网络连接异常';

    const { info, message } = data;

    // 高德地图常见错误代码
    switch (info) {
      case 'INVALID_PARAMS':
        return '参数无效，请检查坐标格式';
      case 'USERKEY_REJECT':
        return 'API Key无效或被拒绝，请检查配置';
      case 'INVALID_USER_SCODE':
        return 'API Key权限不足，请开启Web服务权限';
      case 'INSUFFICIENT_PRIVILEGES':
        return 'API Key权限不足或服务未开通';
      case 'USERKEY_PLAT_NOSUPPORT':
        return 'API Key平台不支持当前服务';
      case 'OUT_OF_SERVICE':
        return '服务暂停，请稍后重试';
      case 'OVER_QUOTA':
        return 'API调用配额已用完，请检查账户余额';
      case 'UNKNOWN_ERROR':
        return message || '服务器内部错误';
      case 'REQUEST_TOO_FAST':
        return '请求频率过高，请降低调用频率';
      default:
        return `逆地理编码失败 (${info}): ${message || '未知错误'}`;
    }
  }

  /**
   * 根据高德API响应获取详细的错误信息（地点搜索）
   */
  private getPlaceSearchErrorMessage(data: any): string {
    if (!data) return '网络连接异常，请检查网络后重试';

    const { info, message } = data;

    // 高德地图地点搜索错误代码
    switch (info) {
      case 'INVALID_PARAMS':
        return '搜索参数无效，请检查搜索关键词';
      case 'USERKEY_REJECT':
        return '地图服务配置错误（API Key被拒绝），请联系管理员';
      case 'INVALID_USER_KEY':
        return '地图服务配置错误（API Key无效），请联系管理员';
      case 'INVALID_USER_SCODE':
        return '地图服务权限不足（需开启搜索服务权限），请联系管理员';
      case 'INSUFFICIENT_PRIVILEGES':
        return '地图服务权限不足或搜索服务未开通，请联系管理员';
      case 'USERKEY_PLAT_NOSUPPORT':
        return '当前API Key不支持搜索服务，请联系管理员检查配置';
      case 'OUT_OF_SERVICE':
        return '搜索服务暂时不可用，请稍后重试';
      case 'OVER_QUOTA':
        return '搜索服务调用次数已达上限，请联系管理员检查配额';
      case 'UNKNOWN_ERROR':
        return `搜索服务异常: ${message || '未知错误，请稍后重试'}`;
      case 'REQUEST_TOO_FAST':
        return '搜索请求过于频繁，请稍后再试';
      case 'NO_DATA':
        return '搜索服务暂无数据，请稍后重试';
      case 'INVALID_REQUEST':
        return '搜索请求格式错误，请检查搜索关键词';
      case 'TIMEOUT':
        return '搜索请求超时，请检查网络连接后重试';
      default:
        if (message) {
          return `搜索失败 (${info}): ${message}`;
        }
        return `搜索服务异常 (${info})，请稍后重试或联系管理员`;
    }
  }

  async searchLocation(): Promise<void> {
    if (!this.searchKeyword.trim()) {
      this.searchError = '请输入搜索关键词';
      return;
    }

    this.searchError = '';
    console.log('开始搜索地点:', {
      keyword: this.searchKeyword,
      city: this.city || '全国'
    });

    try {
      const result: any = await new Promise((resolve, reject) => {
        this.placeSearch.search(this.searchKeyword, (status: string, data: any) => {
          console.log('地点搜索响应:', {
            status,
            info: data?.info,
            poisCount: data?.poiList?.pois?.length || 0,
            keyword: this.searchKeyword
          });

          if (status === 'complete' && data.info === 'OK') {
            if (data.poiList?.pois?.length > 0) {
              resolve(data);
            } else {
              reject({ status, data, reason: 'NO_RESULTS' });
            }
          } else {
            reject({ status, data, reason: 'API_ERROR' });
          }
        });
      });

      const poi = result.poiList.pois[0];
      const lng = poi.location.lng;
      const lat = poi.location.lat;

      console.log('搜索成功，选中第一个结果:', {
        name: poi.name,
        address: poi.address,
        location: { lng, lat }
      });

      this.addMarker(lng, lat);
      this.selectedLocation = {
        longitude: lng,
        latitude: lat,
        address: poi.name + ' ' + poi.address
      };
      this.locationPick.emit(this.selectedLocation);
    } catch (error: any) {
      console.error('搜索失败详情:', error);

      if (error.reason === 'NO_RESULTS') {
        this.searchError = `未找到"${this.searchKeyword}"相关地点，请尝试：\n• 使用更具体的关键词\n• 检查拼写是否正确\n• 尝试搜索附近的标志性建筑`;
      } else {
        this.searchError = this.getPlaceSearchErrorMessage(error.data);
      }

      // 5秒后自动清除错误提示
      setTimeout(() => {
        this.searchError = '';
      }, 5000);
    }
  }

  /**
   * 重试初始化地图
   */
  async retryInitMap(): Promise<void> {
    console.log('用户点击重试，重新初始化地图...');
    await this.performRetry();
  }

  /**
   * 清除缓存并重试
   */
  async clearCacheAndRetry(): Promise<void> {
    console.log('用户点击清除缓存重试...');

    // 清除配置服务的缓存
    this.configService.clearCache();

    // 清除地图加载器的缓存
    if (typeof window !== 'undefined' && (window as any).AMapLoader) {
      console.log('清除高德地图加载器缓存...');
      // 高德地图加载器缓存清理（如果可用）
    }

    await this.performRetry();
  }

  /**
   * 执行重试逻辑
   */
  private async performRetry(): Promise<void> {
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
      // 不再设置hasError，让initMap方法处理
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
