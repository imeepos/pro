import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiUrl } from '@pro/config';

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
  isDefault?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScreenDto {
  name: string;
  description?: string;
  layout: LayoutConfig;
  components?: Component[];
}

export interface UpdateScreenDto {
  name?: string;
  description?: string;
  layout?: LayoutConfig;
  components?: Component[];
}

export interface ScreenListResponse {
  items: ScreenPage[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class ScreenApiService {
  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = `${getApiUrl()}/screens`;
  }

  getScreens(page = 1, limit = 20): Observable<ScreenListResponse> {
    return this.http.get<ScreenListResponse>(`${this.baseUrl}`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  getScreen(id: string): Observable<ScreenPage> {
    return this.http.get<ScreenPage>(`${this.baseUrl}/${id}`);
  }

  createScreen(dto: CreateScreenDto): Observable<ScreenPage> {
    return this.http.post<ScreenPage>(`${this.baseUrl}`, dto);
  }

  updateScreen(id: string, dto: UpdateScreenDto): Observable<ScreenPage> {
    return this.http.put<ScreenPage>(`${this.baseUrl}/${id}`, dto);
  }

  deleteScreen(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  copyScreen(id: string): Observable<ScreenPage> {
    return this.http.post<ScreenPage>(`${this.baseUrl}/${id}/copy`, {});
  }

  publishScreen(id: string): Observable<ScreenPage> {
    return this.http.post<ScreenPage>(`${this.baseUrl}/${id}/publish`, {});
  }

  draftScreen(id: string): Observable<ScreenPage> {
    return this.http.post<ScreenPage>(`${this.baseUrl}/${id}/draft`, {});
  }

  setDefaultScreen(id: string): Observable<ScreenPage> {
    return this.http.put<ScreenPage>(`${this.baseUrl}/default/${id}`, {});
  }

  getDefaultScreen(): Observable<ScreenPage> {
    return this.http.get<ScreenPage>(`${this.baseUrl}/default`);
  }
}
