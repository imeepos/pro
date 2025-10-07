import { Observable } from 'rxjs';
export interface IHttpRequestOptions {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}
export interface IHttpClient {
    get<T>(url: string, options?: IHttpRequestOptions): Observable<T>;
    post<T>(url: string, body?: any, options?: IHttpRequestOptions): Observable<T>;
    put<T>(url: string, body?: any, options?: IHttpRequestOptions): Observable<T>;
    delete<T>(url: string, options?: IHttpRequestOptions): Observable<T>;
    patch<T>(url: string, body?: any, options?: IHttpRequestOptions): Observable<T>;
}
//# sourceMappingURL=http-client.interface.d.ts.map