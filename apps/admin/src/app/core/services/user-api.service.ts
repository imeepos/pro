import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IUserService, User } from '@pro/sdk';
import { getApiUrl } from '@pro/config';

@Injectable({
  providedIn: 'root'
})
export class UserApiService implements IUserService {
  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = `${getApiUrl()}/users`;
  }

  getUserInfo(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  updateUserInfo(id: string, data: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/${id}`, data);
  }
}
