import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiUrl } from '@pro/config';

export interface LoggedInUsersStats {
  total: number;
  todayNew: number;
  online: number;
}

@Injectable({
  providedIn: 'root'
})
export class WeiboService {
  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = `${getApiUrl()}/weibo`;
  }

  getLoggedInUsersStats(): Observable<LoggedInUsersStats> {
    return this.http.get<LoggedInUsersStats>(`${this.baseUrl}/logged-in-users/stats`);
  }
}
