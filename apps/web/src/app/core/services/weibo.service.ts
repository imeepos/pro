import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface LoggedInUsersStats {
  total: number;
  todayNew: number;
  online: number;
}

@Injectable({
  providedIn: 'root'
})
export class WeiboService {
  constructor(private httpClient: HttpClientService) {}

  getLoggedInUsersStats(): Observable<LoggedInUsersStats> {
    return this.httpClient.get<LoggedInUsersStats>('/weibo/logged-in-users/stats');
  }
}
