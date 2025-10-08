import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IUserService } from '@pro/sdk';
import { User } from '@pro/types';
import { HttpClientService } from './http-client.service';

@Injectable({
  providedIn: 'root'
})
export class UserService implements IUserService {
  constructor(private httpClient: HttpClientService) {}

  getUserInfo(id: string): Observable<User> {
    return this.httpClient.get<User>(`/users/${id}`);
  }

  updateUserInfo(id: string, data: Partial<User>): Observable<User> {
    return this.httpClient.put<User>(`/users/${id}`, data);
  }
}
