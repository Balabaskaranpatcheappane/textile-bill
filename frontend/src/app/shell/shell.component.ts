import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar no-print">
        <div class="brand">
          <span class="logo">🧵</span>
          <div>
            <div class="brand-name">Textiles</div>
            <div class="brand-sub">Billing</div>
          </div>
        </div>
        <nav>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Dashboard</a>
          <a routerLink="/invoices/new" routerLinkActive="active">New Invoice</a>
          <a routerLink="/invoices" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Invoices</a>
          <a routerLink="/products" routerLinkActive="active">Products</a>
          <a routerLink="/customers" routerLinkActive="active">Customers</a>
          <a routerLink="/reports" routerLinkActive="active">Reports</a>
          <a routerLink="/settings" routerLinkActive="active">Settings</a>
        </nav>

        <div class="user-box" *ngIf="auth.user() as u">
          <div class="user-name">{{ u.name }}</div>
          <div class="user-sub">{{ u.username }} · {{ u.role }}</div>
          <button class="secondary" style="margin-top:8px; width:100%" (click)="auth.logout()">
            Sign out
          </button>
        </div>
      </aside>

      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .shell { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
    .sidebar {
      background: #101827; color: #e5e7eb; padding: 20px 12px;
      position: sticky; top: 0; height: 100vh;
      display: flex; flex-direction: column;
    }
    .brand { display: flex; align-items: center; gap: 10px; padding: 4px 8px 20px; }
    .logo { font-size: 28px; }
    .brand-name { font-weight: 700; font-size: 15px; }
    .brand-sub  { font-size: 12px; color: #9ca3af; }
    .sidebar nav { display: flex; flex-direction: column; gap: 2px; }
    .sidebar nav a {
      color: #cbd5e1; padding: 8px 12px; border-radius: 6px;
      font-size: 14px; text-decoration: none;
    }
    .sidebar nav a:hover { background: #1f2937; color: #fff; text-decoration: none; }
    .sidebar nav a.active { background: #4f46e5; color: #fff; }

    .user-box {
      margin-top: auto; padding: 12px; background: #1f2937; border-radius: 8px;
      font-size: 12px;
    }
    .user-name { font-weight: 600; color: #fff; font-size: 13px; }
    .user-sub { color: #9ca3af; margin-top: 2px; }

    .content { padding: 20px 28px; overflow-x: hidden; }

    @media (max-width: 800px) {
      .shell { grid-template-columns: 1fr; }
      .sidebar { position: static; height: auto; }
      .sidebar nav { flex-direction: row; flex-wrap: wrap; }
      .user-box { margin-top: 12px; }
    }
    @media print {
      .shell { grid-template-columns: 1fr; }
      .sidebar { display: none; }
      .content { padding: 0; }
    }
  `],
})
export class ShellComponent {
  auth = inject(AuthService);
}
