import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  NgZone,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { firstValueFrom, of, Subject } from 'rxjs';
import { catchError, map, take, takeUntil } from 'rxjs/operators';
import { ConfigService } from '../../../core/services/config.service';
import { environment } from '../../../../environments/environment';
import { loadAmapLoader } from '@pro/components';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  location: { lng: number; lat: number };
}

type PlaceSearchOutcome =
  | { type: 'success'; pois: any[] }
  | { type: 'empty'; result: any }
  | { type: 'error'; result: any };

export interface MapPoint {
  longitude: number;
  latitude: number;
  province?: string;
  city?: string;
  district?: string;
  street?: string;
  locationText?: string;
}

@Component({
  selector: 'pro-map-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MapLocationPickerComponent),
      multi: true
    }
  ],
  templateUrl: './map-location-picker.component.html',
  styleUrls: ['./map-location-picker.component.scss']
})
export class MapLocationPickerComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
  @Input() height = '320px';
  @Input() zoom = 12;

  @Output() pointChange = new EventEmitter<MapPoint | null>();

  @ViewChild('mapHost', { static: true }) private mapHostRef?: ElementRef<HTMLDivElement>;

  isLoading = true;
  errorMessage = '';
  selectedPoint: MapPoint | null = null;
  searchTerm = '';
  searchError = '';
  searching = false;
  searchResults: SearchResult[] = [];
  activeResultId: string | null = null;

  private readonly destroy$ = new Subject<void>();
  private map: any;
  private marker: any;
  private amapNamespace: any;
  private geocoder: any;
  private placeSearch: any;
  private change: (value: MapPoint | null) => void = () => {};
  private touched: () => void = () => {};
  private mapClickHandler?: (event: any) => void;

  constructor(
    private readonly configService: ConfigService,
    private readonly ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    this.bootstrapMap();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.map && this.mapClickHandler) {
      this.map.off('click', this.mapClickHandler);
    }

    if (this.map) {
      this.map.destroy();
    }
  }

  registerOnChange(fn: (value: MapPoint | null) => void): void {
    this.change = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }

  writeValue(value: MapPoint | null): void {
    this.selectedPoint = value;
    if (value && this.map) {
      this.placeMarker([value.longitude, value.latitude], value.locationText);
      this.map.setZoomAndCenter(this.zoom, [value.longitude, value.latitude]);
    } else if (!value && this.marker) {
      this.marker.setMap(null);
      this.marker = undefined;
    }
  }

  setDisabledState(isDisabled: boolean): void {
    if (!this.map) {
      return;
    }
    if (isDisabled) {
      this.map.setStatus({ dragEnable: false, zoomEnable: false });
    } else {
      this.map.setStatus({ dragEnable: true, zoomEnable: true });
    }
  }

  clearSelection(): void {
    this.touched();

    if (this.marker) {
      this.marker.setMap(null);
      this.marker = undefined;
    }

    this.selectedPoint = null;
    this.change(null);
    this.pointChange.emit(null);
    this.searchResults = [];
    this.activeResultId = null;
    this.searchError = '';
  }

  private async bootstrapMap(): Promise<void> {
    if (!this.mapHostRef) {
      this.errorMessage = '地图容器未准备就绪';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const key = await this.loadAmapKey();
      if (!key) {
        this.errorMessage = '未配置有效的高德地图API Key';
        return;
      }

      const securityCode = (environment as { amapSecurityCode?: string }).amapSecurityCode;
      if (securityCode) {
        (window as { _AMapSecurityConfig?: { securityJsCode: string } })._AMapSecurityConfig = {
          securityJsCode: securityCode
        };
      }

      const loader = await loadAmapLoader();

      this.amapNamespace = await loader.load({
        key,
        version: '2.0',
        plugins: ['AMap.Geocoder', 'AMap.PlaceSearch', 'AMap.AutoComplete']
      });

      this.map = new this.amapNamespace.Map(this.mapHostRef.nativeElement, {
        zoom: this.zoom,
        center: this.selectedPoint
          ? [this.selectedPoint.longitude, this.selectedPoint.latitude]
          : [116.397428, 39.90923],
        viewMode: '3D'
      });

      this.geocoder = new this.amapNamespace.Geocoder();
      this.placeSearch = new this.amapNamespace.PlaceSearch({
        pageSize: 6,
        extensions: 'all',
        citylimit: false
      });

      this.mapClickHandler = (event: { lnglat: any }) => {
        this.ngZone.run(() => {
          this.touched();
          this.activeResultId = null;
          this.handleSelection(event.lnglat);
        });
      };

      this.map.on('click', this.mapClickHandler);

      if (this.selectedPoint) {
        this.placeMarker(
          [this.selectedPoint.longitude, this.selectedPoint.latitude],
          this.selectedPoint.locationText
        );
        this.map.setZoomAndCenter(this.zoom, [this.selectedPoint.longitude, this.selectedPoint.latitude]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '地图加载失败';
      this.errorMessage = message;
    } finally {
      this.isLoading = false;
    }
  }

  private async loadAmapKey(): Promise<string | null> {
    return firstValueFrom(
      this.configService
        .getAmapApiKeyObservable()
        .pipe(
          takeUntil(this.destroy$),
          map((key) => (key && key !== 'YOUR_AMAP_KEY' ? key : null)),
          take(1),
          catchError(() => of(null))
        )
    );
  }

  private async handleSelection(lngLat: any): Promise<void> {
    let resolvedLngLat = lngLat;
    if (this.amapNamespace && !(lngLat instanceof this.amapNamespace.LngLat)) {
      resolvedLngLat = new this.amapNamespace.LngLat(lngLat.getLng(), lngLat.getLat());
    }

    const basePoint: MapPoint = {
      longitude: resolvedLngLat.getLng(),
      latitude: resolvedLngLat.getLat()
    };

    let enrichedPoint: Partial<MapPoint> = {};

    if (this.geocoder) {
      try {
        enrichedPoint = await this.reverseGeocode(resolvedLngLat);
      } catch (error) {
        console.warn('逆地理编码失败', error);
      }
    }

    const locationSegments = [
      enrichedPoint.province,
      enrichedPoint.city,
      enrichedPoint.district,
      enrichedPoint.street
    ].filter((segment): segment is string => !!segment && segment.trim().length > 0);

    const summary = enrichedPoint.locationText && enrichedPoint.locationText.trim().length > 0
      ? enrichedPoint.locationText.trim()
      : locationSegments.join(' ');

    const fallbackSummary = summary || `${basePoint.longitude.toFixed(6)}, ${basePoint.latitude.toFixed(6)}`;

    const resolvedPoint: MapPoint = {
      ...basePoint,
      ...enrichedPoint,
      locationText: fallbackSummary
    };

    this.selectedPoint = resolvedPoint;
    this.placeMarker(
      [resolvedPoint.longitude, resolvedPoint.latitude],
      resolvedPoint.locationText
    );

    if (this.map) {
      const currentZoom = typeof this.map.getZoom === 'function' ? this.map.getZoom() : this.zoom;
      const targetZoom = Math.max(currentZoom, this.zoom);
      this.map.setZoomAndCenter(targetZoom, [resolvedPoint.longitude, resolvedPoint.latitude]);
    }

    this.change(resolvedPoint);
    this.pointChange.emit(resolvedPoint);
  }

  formatPoint(point: MapPoint | null): string {
    if (!point) {
      return '';
    }

    if (point.locationText && point.locationText.trim().length > 0) {
      return point.locationText;
    }

    const segments = [
      point.province,
      point.city,
      point.district,
      point.street
    ].filter((segment): segment is string => !!segment && segment.trim().length > 0);

    return segments.join(' · ');
  }

  private placeMarker(position: [number, number], address?: string): void {
    if (!this.map || !this.amapNamespace) {
      return;
    }

    if (!this.marker) {
      this.marker = new this.amapNamespace.Marker({
        position,
        draggable: false
      });
      this.marker.setMap(this.map);
    } else {
      this.marker.setPosition(position);
    }

    if (address) {
      this.marker.setTitle(address);
    }
  }

  private reverseGeocode(lngLat: any): Promise<Partial<MapPoint>> {
    if (!this.geocoder) {
      return Promise.resolve({});
    }

    return new Promise((resolve) => {
      this.geocoder!.getAddress(
        lngLat,
        (
          status: string,
          result: {
            regeocode?: {
              formattedAddress?: string;
              addressComponent?: {
                province?: string;
                city?: string | string[];
                district?: string;
                township?: string;
                streetNumber?: { street?: string; number?: string };
              };
            };
          }
        ) => {
          if (status !== 'complete' || !result.regeocode) {
            resolve({});
            return;
          }

          const { formattedAddress, addressComponent } = result.regeocode;
          const cityComponent = addressComponent?.city;
          const city = Array.isArray(cityComponent) ? cityComponent[0] : cityComponent;
          const streetParts = [
            addressComponent?.township,
            addressComponent?.streetNumber?.street,
            addressComponent?.streetNumber?.number
          ].filter(Boolean);

          resolve({
            province: addressComponent?.province,
            city: city || addressComponent?.province,
            district: addressComponent?.district,
            street: streetParts.length ? streetParts.join(' ') : undefined,
            locationText: formattedAddress
          });
        }
      );
    });
  }

  async searchLocation(): Promise<void> {
    if (!this.placeSearch) {
      this.searchError = '搜索服务尚未准备就绪';
      return;
    }

    const keyword = this.searchTerm.trim();
    if (!keyword) {
      this.searchResults = [];
      this.searchError = '';
      this.activeResultId = null;
      return;
    }

    this.searching = true;
    this.searchError = '';
    this.activeResultId = null;
    this.searchResults = [];

    const outcome = await this.performPlaceSearch(keyword);

    if (outcome.type === 'success') {
      const results = outcome.pois
        .map((poi: any) => this.toSearchResult(poi))
        .filter((poi: SearchResult | null): poi is SearchResult => poi !== null);

      this.ngZone.run(() => {
        this.searching = false;

        if (!results.length) {
          this.searchResults = [];
          this.activeResultId = null;
          this.searchError = '未找到匹配的地点，请尝试其他关键词';
          return;
        }

        this.searchResults = results;
        this.searchError = '';

        const [firstResult] = this.searchResults;
        if (firstResult) {
          this.selectSearchResult(firstResult);
        }
      });

      return;
    }

    const fallbackResult = await this.performGeocodeSearch(keyword);

    this.ngZone.run(() => {
      this.searching = false;

      if (fallbackResult) {
        this.searchResults = [fallbackResult];
        this.searchError = '';
        this.selectSearchResult(fallbackResult);
        return;
      }

      this.searchResults = [];
      this.activeResultId = null;

      const baseMessage = '未找到匹配的地点，请尝试其他关键词';
      this.searchError = outcome.type === 'error'
        ? `${baseMessage}\n${this.describePlaceSearchError(outcome.result)}`
        : baseMessage;
    });
  }

  selectSearchResult(result: SearchResult): void {
    this.activeResultId = result.id;

    if (!this.map || !this.amapNamespace) {
      return;
    }

    const lngLat = new this.amapNamespace.LngLat(result.location.lng, result.location.lat);
    this.map.setZoomAndCenter(Math.max(this.map.getZoom(), this.zoom), lngLat);
    this.handleSelection(lngLat);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchResults = [];
    this.searchError = '';
    this.activeResultId = null;
  }

  private performPlaceSearch(keyword: string): Promise<PlaceSearchOutcome> {
    return new Promise((resolve) => {
      this.ngZone.runOutsideAngular(() => {
        this.placeSearch!.search(keyword, (status: string, result: { poiList?: { pois?: any[] }; info?: string }) => {
          if (status === 'complete' && result.poiList?.pois?.length) {
            resolve({ type: 'success', pois: result.poiList.pois });
            return;
          }

          if (status === 'complete') {
            resolve({ type: 'empty', result });
            return;
          }

          resolve({ type: 'error', result });
        });
      });
    });
  }

  private performGeocodeSearch(keyword: string): Promise<SearchResult | null> {
    if (!this.geocoder) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      this.ngZone.runOutsideAngular(() => {
        this.geocoder!.getLocation(keyword, (status: string, result: { geocodes?: any[] }) => {
          if (status !== 'complete' || !result.geocodes?.length) {
            resolve(null);
            return;
          }

          const [geocode] = result.geocodes;
          const syntheticPoi = {
            id: geocode.id || geocode.adcode || `${keyword}-${Date.now()}`,
            name: geocode.formattedAddress || keyword,
            address: geocode.formattedAddress || [
              geocode.province,
              Array.isArray(geocode.city) ? geocode.city[0] : geocode.city,
              geocode.district,
              geocode.township
            ].filter(Boolean).join(' '),
            location: geocode.location
          };

          resolve(this.toSearchResult(syntheticPoi));
        });
      });
    });
  }

  private describePlaceSearchError(result: { info?: string; message?: string }): string {
    const info = result?.info;
    const message = result?.message;

    switch (info) {
      case 'INVALID_PARAMS':
        return '搜索参数无效，请检查关键词格式。';
      case 'USERKEY_REJECT':
        return '地图服务配置错误：API Key 被拒绝。';
      case 'INVALID_USER_KEY':
        return '地图服务配置错误：API Key 无效。';
      case 'INVALID_USER_SCODE':
        return '地图服务权限不足：缺少安全密钥或权限未开通。';
      case 'INSUFFICIENT_PRIVILEGES':
        return '地图服务权限不足或搜索服务未开通。';
      case 'USERKEY_PLAT_NOSUPPORT':
        return '当前 API Key 不支持地点搜索服务。';
      case 'USERKEY_PLAT_NOMATCH':
        return 'API Key 平台类型与当前使用场景不匹配。';
      case 'OUT_OF_SERVICE':
        return '搜索服务暂时不可用，请稍后再试。';
      case 'OVER_QUOTA':
        return '搜索服务调用次数已达上限。';
      case 'UNKNOWN_ERROR':
        return `搜索服务异常：${message || '未知错误'}`;
      case 'REQUEST_TOO_FAST':
        return '搜索请求过于频繁，请稍后再试。';
      case 'NO_DATA':
        return '搜索服务暂无数据返回。';
      case 'INVALID_REQUEST':
        return '搜索请求格式不正确。';
      case 'TIMEOUT':
        return '搜索请求超时，请检查网络连接。';
      default:
        if (info) {
          return `搜索服务返回异常 (${info})${message ? `：${message}` : ''}`;
        }
        return '搜索服务暂时不可用，请稍后重试。';
    }
  }

  private toSearchResult(poi: any): SearchResult | null {
    if (!poi) {
      return null;
    }

    const rawLocation = poi.location;

    let lng: number | null = null;
    let lat: number | null = null;

    if (rawLocation) {
      if (typeof rawLocation === 'string') {
        const [lngStr, latStr] = rawLocation.split(',');
        lng = Number(lngStr);
        lat = Number(latStr);
      } else if (typeof rawLocation.lng === 'number' && typeof rawLocation.lat === 'number') {
        lng = rawLocation.lng;
        lat = rawLocation.lat;
      } else if (rawLocation.getLng && rawLocation.getLat) {
        lng = rawLocation.getLng();
        lat = rawLocation.getLat();
      }
    }

    if (lng === null || lat === null || Number.isNaN(lng) || Number.isNaN(lat)) {
      return null;
    }

    return {
      id: poi.id || `${lng},${lat}`,
      name: poi.name || '未知地点',
      address: poi.address || poi.adname || '',
      location: { lng, lat }
    };
  }
}
