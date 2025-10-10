import { Injectable, inject } from '@angular/core';
import { Observable, tap, catchError, throwError, finalize } from 'rxjs';
import { SkerSDK, User } from '@pro/sdk';

@Injectable({ providedIn: 'root' })
export class UserService {
  private sdk = inject(SkerSDK);

  /**
   * 获取用户信息
   */
  getUserInfo(id: string): Observable<User> {
    return this.sdk.user.getUserInfo(id).pipe(
      catchError(error => {
        console.error('获取用户信息失败:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * 更新用户信息
   */
  updateUserInfo(id: string, data: Partial<User>): Observable<User> {
    return this.sdk.user.updateUserInfo(id, data).pipe(
      tap(updatedUser => {
        console.log('用户信息更新成功:', updatedUser);
      }),
      catchError(error => {
        console.error('更新用户信息失败:', error);
        return throwError(() => error);
      })
    );
  }
}