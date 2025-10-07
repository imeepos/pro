import { Observable } from 'rxjs';
import { User } from '@pro/types';
export interface IUserService {
    getUserInfo(id: string): Observable<User>;
    updateUserInfo(id: string, data: Partial<User>): Observable<User>;
}
//# sourceMappingURL=user.interface.d.ts.map