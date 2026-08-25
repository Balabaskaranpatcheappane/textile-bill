import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrap">
      <form class="panel login-card" (ngSubmit)="submit()">
        <div class="brand">🧵 <span>Textiles Billing</span></div>
        <h2 style="margin:0 0 4px">Sign in</h2>
        <p class="muted">Enter your credentials to continue.</p>

        <label>Username</label>
        <input name="username" [(ngModel)]="username" autofocus autocomplete="username">

        <label>Password</label>
        <input name="password" type="password" [(ngModel)]="password" autocomplete="current-password">

        <div *ngIf="error()" class="error">{{ error() }}</div>

        <button type="submit" [disabled]="busy() || !username || !password"
                style="margin-top:12px; width:100%">
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>

        <div class="hint">
          Default admin on a fresh install: <code>admin</code> / <code>admin123</code> —
          change the password immediately.
        </div>
      </form>
    </div>
  `,
  styles: [`
    .login-wrap {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      padding: 20px;
    }
    .login-card { width: 100%; max-width: 380px; }
    .brand { font-size: 20px; font-weight: 700; margin-bottom: 16px; }
    .brand span { margin-left: 6px; }
    .muted { color: var(--muted); margin: 0 0 16px; font-size: 13px; }
    label { margin-top: 10px; }
    .error {
      background: #fee2e2; color: #991b1b; border-radius: 6px;
      padding: 8px 10px; margin-top: 10px; font-size: 13px;
    }
    .hint {
      margin-top: 14px; font-size: 12px; color: var(--muted); line-height: 1.5;
    }
    code { background: #eef2ff; padding: 1px 5px; border-radius: 4px; color: var(--primary); }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  busy = signal(false);
  error = signal<string | null>(null);

  submit() {
    if (!this.username || !this.password) return;
    this.busy.set(true);
    this.error.set(null);
    this.auth.login(this.username, this.password).subscribe({
      next: () => { this.busy.set(false); this.router.navigate(['/']); },
      error: (e) => {
        this.busy.set(false);
        this.error.set(e?.error?.error || 'Sign-in failed');
      },
    });
  }
}
