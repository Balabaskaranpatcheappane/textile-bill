import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="header-bar">
      <h2 style="margin:0">My Profile</h2>
    </div>

    <div class="panel" *ngIf="auth.user() as u" style="margin-bottom:12px">
      <div class="grid-2">
        <div><div class="lbl">Name</div><div class="val">{{ u.name }}</div></div>
        <div><div class="lbl">Username</div><div class="val">{{ u.username }}</div></div>
        <div><div class="lbl">Role</div>
          <div class="val"><span class="tag" [class.role-admin]="u.role === 'admin'">{{ u.role }}</span></div>
        </div>
      </div>
    </div>

    <div class="panel" style="max-width:480px">
      <h3 style="margin-top:0">Change password</h3>

      <label>Current password</label>
      <input type="password" [(ngModel)]="current" autocomplete="current-password">

      <label>New password (min 6 characters)</label>
      <input type="password" [(ngModel)]="next" autocomplete="new-password">

      <label>Confirm new password</label>
      <input type="password" [(ngModel)]="confirm" autocomplete="new-password">

      <div *ngIf="msg()" class="msg" [class.err]="err()">{{ msg() }}</div>

      <div style="margin-top:12px; display:flex; justify-content:flex-end; gap:8px">
        <button (click)="save()" [disabled]="!canSave() || saving()">
          {{ saving() ? 'Updating…' : 'Update password' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .lbl { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
    .val { font-weight: 600; margin-top: 2px; }
    .tag.role-admin { background: #ffedd5; color: #9a3412; }
    .msg     { margin-top: 10px; color: var(--success); font-size: 13px; }
    .msg.err { color: var(--danger); }
  `],
})
export class ProfileComponent {
  auth = inject(AuthService);

  current = '';
  next = '';
  confirm = '';
  saving = signal(false);
  msg = signal<string | null>(null);
  err = signal(false);

  canSave(): boolean {
    return this.current.length > 0
        && this.next.length >= 6
        && this.next === this.confirm;
  }

  save() {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.err.set(false);
    this.msg.set(null);
    this.auth.changePassword(this.current, this.next).subscribe({
      next: () => {
        this.saving.set(false);
        this.msg.set('Password updated.');
        this.current = ''; this.next = ''; this.confirm = '';
      },
      error: (e) => {
        this.saving.set(false);
        this.err.set(true);
        this.msg.set(e?.error?.error || 'Update failed');
      },
    });
  }
}
