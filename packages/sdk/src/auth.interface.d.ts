import { Observable } from 'rxjs';
import { LoginDto, RegisterDto, AuthResponse, UserProfile } from '@pro/types';
export interface IAuthService {
    login(dto: LoginDto): Observable<AuthResponse>;
    register(dto: RegisterDto): Observable<AuthResponse>;
    logout(): Observable<void>;
    refreshToken(refreshToken: string): Observable<AuthResponse>;
    getProfile(): Observable<UserProfile>;
}
//# sourceMappingURL=auth.interface.d.ts.map