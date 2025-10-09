import { Injectable } from '@angular/core';
import { DataAcceptor, DataInstance, DataResponse } from '../../models/data-source.model';
import { DataStatus } from '../../models/data-source.enum';

export interface DemoDataOptions {
  data: any;
}

@Injectable({ providedIn: 'root' })
export class DemoDataHandler implements DataInstance {
  private data: any;

  async connect(acceptor: DataAcceptor, options?: DemoDataOptions): Promise<void> {
    if (options?.data) {
      this.data = options.data;
    }
    const response = await this.getRespData(options);
    acceptor(response);
  }

  async getRespData(options?: DemoDataOptions): Promise<DataResponse> {
    const data = options?.data ?? this.data ?? null;
    return {
      status: DataStatus.SUCCESS,
      data,
      timestamp: Date.now()
    };
  }

  async debug(acceptor: DataAcceptor): Promise<void> {
    const response = await this.getRespData();
    acceptor(response);
  }

  disconnect(): void {
    this.data = null;
  }
}
