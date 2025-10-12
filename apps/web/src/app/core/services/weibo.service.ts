import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';
import { LoggedInUsersStats } from '@pro/sdk';

@Injectable({
  providedIn: 'root'
})
export class WeiboService {
  constructor(private httpClient: HttpClientService) {}

  getLoggedInUsersStats(): Observable<LoggedInUsersStats> {
    return this.httpClient.get<LoggedInUsersStats>('/weibo/logged-in-users/stats');
  }
}
