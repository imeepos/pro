import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Data {
  id: string;
  title: string;
  type: string;
  status: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataListResponse {
  data: Data[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateDataRequest {
  title: string;
  type: string;
  content?: string;
  status?: string;
}

export interface UpdateDataRequest extends Partial<CreateDataRequest> {
  id: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly baseUrl = '/api/data';

  constructor(private http: HttpClient) {}

  getDataList(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Observable<DataListResponse> {
    return this.http.get<DataListResponse>(this.baseUrl, { params });
  }

  getData(id: string): Observable<Data> {
    return this.http.get<Data>(`${this.baseUrl}/${id}`);
  }

  createData(data: CreateDataRequest): Observable<Data> {
    return this.http.post<Data>(this.baseUrl, data);
  }

  updateData(data: UpdateDataRequest): Observable<Data> {
    return this.http.put<Data>(`${this.baseUrl}/${data.id}`, data);
  }

  deleteData(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getDataStats(): Observable<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
  }> {
    return this.http.get<{
      total: number;
      active: number;
      inactive: number;
      pending: number;
    }>(`${this.baseUrl}/stats`);
  }
}