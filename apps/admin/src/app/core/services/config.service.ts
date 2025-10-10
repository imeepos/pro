import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly amapApiKey: string;

  constructor() {
    this.amapApiKey = environment.amapApiKey || '';
  }

  getAmapApiKey(): string {
    return this.amapApiKey;
  }

  hasValidAmapKey(): boolean {
    return !!this.amapApiKey && this.amapApiKey !== 'YOUR_AMAP_KEY';
  }
}