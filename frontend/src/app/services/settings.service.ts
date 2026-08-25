import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { ShopSettings } from '../models';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);

  private _settings = signal<ShopSettings | null>(null);
  readonly settings = this._settings.asReadonly();

  /** Load once; subsequent callers reuse the cached value. */
  load(): Observable<ShopSettings> {
    return this.http.get<ShopSettings>('/api/settings').pipe(
      tap((s) => this._settings.set(s)),
    );
  }

  save(patch: Partial<ShopSettings>) {
    return this.http.put<ShopSettings>('/api/settings', patch).pipe(
      tap((s) => this._settings.set(s)),
    );
  }

  uploadLogo(file: File) {
    const fd = new FormData();
    fd.append('logo', file);
    return this.http.post<{ ok: true }>('/api/settings/logo', fd);
  }

  deleteLogo() {
    return this.http.delete<void>('/api/settings/logo');
  }

  /** Cache-busting logo URL so a fresh upload replaces the cached image. */
  logoUrl(hasLogo: boolean, updatedAt?: string | null): string | null {
    if (!hasLogo) return null;
    const bust = updatedAt ? encodeURIComponent(updatedAt) : Date.now();
    return `/api/settings/logo?v=${bust}`;
  }
}
