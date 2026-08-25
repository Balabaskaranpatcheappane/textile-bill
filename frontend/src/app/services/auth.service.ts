import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { LoginResponse, User } from '../models';

const TOKEN_KEY = 'textiles.token';
const USER_KEY = 'textiles.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<User | null>(this.restoreUser());
  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  private restoreUser(): User | null {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  }

  token() { return this._token(); }

  login(username: string, password: string) {
    return this.http.post<LoginResponse>('/api/auth/login', { username, password }).pipe(
      tap(({ token, user }) => {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this._token.set(token);
        this._user.set(user);
      }),
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  changePassword(current_password: string, new_password: string) {
    return this.http.post<{ ok: true }>('/api/auth/change-password',
      { current_password, new_password });
  }
}
