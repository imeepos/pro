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
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import AMapLoader from '@amap/amap-jsapi-loader';
import { firstValueFrom, of, Subject } from 'rxjs';
import { catchError, map, take, takeUntil } from 'rxjs/operators';
import { ConfigService } from '../../../core/services/config.service';
import { environment } from '../../../../environments/environment';

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
  imports: [CommonModule],
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

  isLoading = false;
  errorMessage = '';
  selectedPoint: MapPoint | null = null;

  private readonly destroy$ = new Subject<void>();
  private map: any;
  private marker: any;
  private amapNamespace: any;
  private geocoder: any;
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
        plugins: ['AMap.Geocoder']
      });

      this.map = new this.amapNamespace.Map(this.mapHostRef.nativeElement, {
        zoom: this.zoom,
        center: this.selectedPoint
          ? [this.selectedPoint.longitude, this.selectedPoint.latitude]
          : [116.397428, 39.90923],
        viewMode: '3D'
      });

      this.geocoder = new this.amapNamespace.Geocoder();

      this.mapClickHandler = (event: { lnglat: any }) => {
        this.ngZone.run(() => {
          this.touched();
          this.handleSelection(event.lnglat);
        });
      };

      this.map.on('click', this.mapClickHandler);

      if (this.selectedPoint) {
        this.placeMarker(
          [this.selectedPoint.longitude, this.selectedPoint.latitude],
          this.selectedPoint.locationText
        );
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
    const basePoint: MapPoint = {
      longitude: lngLat.getLng(),
      latitude: lngLat.getLat()
    };

    let enrichedPoint: Partial<MapPoint> = {};

    if (this.geocoder) {
      try {
        enrichedPoint = await this.reverseGeocode(lngLat);
      } catch (error) {
        console.warn('逆地理编码失败', error);
      }
    }

    const resolvedPoint: MapPoint = {
      ...basePoint,
      ...enrichedPoint,
      locationText: enrichedPoint.locationText ?? enrichedPoint.street ?? enrichedPoint.city ?? enrichedPoint.province
    };

    this.selectedPoint = resolvedPoint;
    this.placeMarker(
      [resolvedPoint.longitude, resolvedPoint.latitude],
      resolvedPoint.locationText
    );

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
}
