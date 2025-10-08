import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface LayoutConfig {
  width: number;
  height: number;
  background: string;
  grid?: {
    enabled: boolean;
    size: number;
  };
}

export interface Component {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
  };
  config: any;
  dataSource?: {
    type: 'api' | 'static';
    url?: string;
    data?: any;
    refreshInterval?: number;
  };
}

export interface ScreenPage {
  id: string;
  name: string;
  description?: string;
  layout: LayoutConfig;
  components: Component[];
  status: 'draft' | 'published';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ScreenApiService {
  constructor(private httpClient: HttpClientService) {}

  getScreen(id: string): Observable<ScreenPage> {
    return this.httpClient.get<ScreenPage>(`/screens/${id}`);
  }

  getDefaultScreen(): Observable<ScreenPage> {
    return this.httpClient.get<ScreenPage>('/screens/default');
  }
}
