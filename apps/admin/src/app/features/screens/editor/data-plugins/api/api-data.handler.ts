import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DataAcceptor, DataInstance, DataResponse, ApiDataConfig } from '../../models/data-source.model';
import { DataStatus } from '../../models/data-source.enum';

@Injectable({ providedIn: 'root' })
export class ApiDataHandler implements DataInstance {
  private intervalId?: number;

  constructor(private http: HttpClient) {}

  async connect(acceptor: DataAcceptor, options?: ApiDataConfig): Promise<void> {
    if (!options) {
      acceptor({ status: DataStatus.ERROR, error: 'API配置不能为空' });
      return;
    }

    await this.fetchData(acceptor, options);

    if (options.interval && options.interval > 0) {
      this.intervalId = window.setInterval(() => {
        this.fetchData(acceptor, options);
      }, options.interval);
    }
  }

  private async fetchData(acceptor: DataAcceptor, config: ApiDataConfig): Promise<void> {
    try {
      const response = await this.getRespData(config);
      acceptor(response);
    } catch (error) {
      acceptor({
        status: DataStatus.ERROR,
        error: error instanceof Error ? error.message : 'API请求失败',
        timestamp: Date.now()
      });
    }
  }

  async getRespData(options?: ApiDataConfig): Promise<DataResponse> {
    if (!options?.url) {
      return {
        status: DataStatus.ERROR,
        error: 'API URL不能为空',
        timestamp: Date.now()
      };
    }

    try {
      const headers = new HttpHeaders(options.headers || {});
      const method = options.method || 'GET';

      let request;
      switch (method) {
        case 'GET':
          request = this.http.get(options.url, {
            headers,
            params: options.params || {}
          });
          break;
        case 'POST':
          request = this.http.post(options.url, options.body, {
            headers,
            params: options.params || {}
          });
          break;
        case 'PUT':
          request = this.http.put(options.url, options.body, {
            headers,
            params: options.params || {}
          });
          break;
        case 'DELETE':
          request = this.http.delete(options.url, {
            headers,
            params: options.params || {}
          });
          break;
        case 'PATCH':
          request = this.http.patch(options.url, options.body, {
            headers,
            params: options.params || {}
          });
          break;
        default:
          return {
            status: DataStatus.ERROR,
            error: `不支持的HTTP方法: ${method}`,
            timestamp: Date.now()
          };
      }

      const data = await firstValueFrom(request);
      return {
        status: DataStatus.SUCCESS,
        data,
        timestamp: Date.now()
      };
    } catch (error: any) {
      return {
        status: DataStatus.ERROR,
        error: error?.message || 'API请求失败',
        timestamp: Date.now()
      };
    }
  }

  async debug(acceptor: DataAcceptor): Promise<void> {
    acceptor({
      status: DataStatus.ERROR,
      error: '请先配置API选项',
      timestamp: Date.now()
    });
  }

  disconnect(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}
