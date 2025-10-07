import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IHttpClient, IHttpRequestOptions } from '@pro/sdk';
import { getApiUrl } from '@pro/config';

@Injectable({
  providedIn: 'root'
})
export class HttpClientService implements IHttpClient {
  private readonly baseURL = getApiUrl();

  constructor(private http: HttpClient) {}

  private buildOptions(options?: IHttpRequestOptions) {
    const httpOptions: {
      headers?: HttpHeaders;
      params?: HttpParams;
      responseType?: any;
      context?: HttpContext;
    } = {};

    if (options?.headers) {
      httpOptions.headers = new HttpHeaders(options.headers);
    }

    if (options?.params) {
      let params = new HttpParams();
      Object.entries(options.params).forEach(([key, value]) => {
        params = params.set(key, String(value));
      });
      httpOptions.params = params;
    }

    if (options?.responseType) {
      httpOptions.responseType = options.responseType;
    }

    return httpOptions;
  }

  private getFullUrl(url: string): string {
    return url.startsWith('http') ? url : `${this.baseURL}${url}`;
  }

  get<T>(url: string, options?: IHttpRequestOptions): Observable<T> {
    return this.http.get<T>(this.getFullUrl(url), this.buildOptions(options)) as Observable<T>;
  }

  post<T>(url: string, body?: any, options?: IHttpRequestOptions): Observable<T> {
    return this.http.post<T>(this.getFullUrl(url), body, this.buildOptions(options)) as Observable<T>;
  }

  put<T>(url: string, body?: any, options?: IHttpRequestOptions): Observable<T> {
    return this.http.put<T>(this.getFullUrl(url), body, this.buildOptions(options)) as Observable<T>;
  }

  delete<T>(url: string, options?: IHttpRequestOptions): Observable<T> {
    return this.http.delete<T>(this.getFullUrl(url), this.buildOptions(options)) as Observable<T>;
  }

  patch<T>(url: string, body?: any, options?: IHttpRequestOptions): Observable<T> {
    return this.http.patch<T>(this.getFullUrl(url), body, this.buildOptions(options)) as Observable<T>;
  }
}
