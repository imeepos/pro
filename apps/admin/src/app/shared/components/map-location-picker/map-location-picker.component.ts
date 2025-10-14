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
import AMapLoader from '@amap/amap-jsapi-loader';
import { firstValueFrom, of, Subject } from 'rxjs';
import { catchError, map, take, takeUntil } from 'rxjs/operators';
import { ConfigService } from '../../../core/services/config.service';
import { environment } from '../../../../environments/environment';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  location: { lng: number; lat: number };
}

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

      this.amapNamespace = await AMapLoader.load({
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

  searchLocation(): void {
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

    this.placeSearch.search(keyword, (status: string, result: { poiList?: { pois?: any[] } }) => {
      this.ngZone.run(() => {
        this.searching = false;

        if (status !== 'complete' || !result.poiList?.pois?.length) {
          this.searchResults = [];
          this.activeResultId = null;
          this.searchError = '未找到匹配的地点，请尝试其他关键词';
          return;
        }

        this.searchResults = result.poiList.pois
          .map((poi: any) => this.toSearchResult(poi))
          .filter((poi: SearchResult | null): poi is SearchResult => poi !== null);

        this.searchError = '';

        if (this.searchResults.length) {
          this.selectSearchResult(this.searchResults[0]);
        }
      });
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
