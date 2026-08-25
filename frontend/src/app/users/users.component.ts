import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../services/auth.service';
import { AppUser, UserRole } from '../models';

interface Draft {
  id?: number;
  name: string;
  username: string;
  password: string;
  role: UserRole;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="header-bar">
      <h2 style="margin:0">Users &amp; Cashiers</h2>
      <button (click)="startNew()">+ Add user</button>
    </div>

    <div class="panel" *ngIf="editing() as u" style="margin-bottom:12px">
      <h3 style="margin-top:0">{{ u.id ? 'Edit user' : 'New user' }}</h3>
      <div class="grid-2">
        <div>
          <label>Full name</label>
          <input [(ngModel)]="u.name" placeholder="e.g. Priya Kumar">
        </div>
        <div>
          <label>Username <span *ngIf="u.id" class="muted">(read-only)</span></label>
          <input [(ngModel)]="u.username" [readonly]="!!u.id"
                 autocomplete="off" placeholder="e.g. priya">
        </div>
        <div *ngIf="!u.id">
          <label>Password</label>
          <input type="password" [(ngModel)]="u.password"
                 autocomplete="new-password" placeholder="at least 6 characters">
        </div>
        <div>
          <label>Role</label>
          <select [(ngModel)]="u.role">
            <option value="cashier">Cashier (add products, create invoices)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </div>
      </div>

      <div *ngIf="err()" class="err">{{ err() }}</div>

      <div style="margin-top:12px; display:flex; gap:8px">
        <button (click)="save()" [disabled]="!canSave() || saving()">
          {{ saving() ? 'Saving…' : 'Save' }}
        </button>
        <button class="secondary" (click)="editing.set(null)">Cancel</button>
      </div>
    </div>

    <div class="panel">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th><th>Username</th><th>Role</th>
            <th>Created</th><th>Last login</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let u of users()">
            <td>
              {{ u.name }}
              <span *ngIf="u.id === auth.user()?.id" class="tag" style="margin-left:6px">you</span>
            </td>
            <td>{{ u.username }}</td>
            <td>
              <span class="tag" [class.role-admin]="u.role === 'admin'">{{ u.role }}</span>
            </td>
            <td>{{ u.created_at | date:'mediumDate' }}</td>
            <td>{{ u.last_login ? (u.last_login | date:'medium') : '—' }}</td>
            <td class="right">
              <button class="secondary" (click)="edit(u)">Edit</button>
              <button class="secondary" style="margin-left:6px" (click)="resetPassword(u)">
                Reset password
              </button>
              <button class="danger" style="margin-left:6px" (click)="remove(u)"
                      [disabled]="u.id === auth.user()?.id">
                Delete
              </button>
            </td>
          </tr>
          <tr *ngIf="users().length === 0">
            <td colspan="6" style="text-align:center; color:var(--muted); padding:20px">
              No users yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .muted { color: var(--muted); font-weight: normal; font-size: 12px; }
    .tag.role-admin { background: #ffedd5; color: #9a3412; }
    .err {
      background: #fee2e2; color: #991b1b; border-radius: 6px;
      padding: 8px 10px; margin-top: 10px; font-size: 13px;
    }
  `],
})
export class UsersComponent implements OnInit {
  auth = inject(AuthService);

  users = signal<AppUser[]>([]);
  editing = signal<Draft | null>(null);
  saving = signal(false);
  err = signal<string | null>(null);

  ngOnInit() { this.reload(); }

  reload() { this.auth.listUsers().subscribe((r) => this.users.set(r)); }

  startNew() {
    this.err.set(null);
    this.editing.set({ name: '', username: '', password: '', role: 'cashier' });
  }

  edit(u: AppUser) {
    this.err.set(null);
    this.editing.set({ id: u.id, name: u.name, username: u.username, password: '', role: u.role });
  }

  canSave(): boolean {
    const u = this.editing();
    if (!u) return false;
    if (!u.name.trim()) return false;
    if (!u.id) {
      if (!u.username.trim() || u.password.length < 6) return false;
    }
    return true;
  }

  save() {
    const u = this.editing();
    if (!u) return;
    this.saving.set(true);
    this.err.set(null);
    const done = () => { this.saving.set(false); this.editing.set(null); this.reload(); };
    const fail = (e: any) => {
      this.saving.set(false);
      this.err.set(e?.error?.error || 'Save failed');
    };
    if (u.id) {
      this.auth.updateUser(u.id, { name: u.name, role: u.role })
        .subscribe({ next: done, error: fail });
    } else {
      this.auth.createUser({
        name: u.name, username: u.username, password: u.password, role: u.role,
      }).subscribe({ next: done, error: fail });
    }
  }

  resetPassword(u: AppUser) {
    const pw = prompt(`New password for ${u.username} (min 6 characters):`);
    if (!pw) return;
    if (pw.length < 6) { alert('Password must be at least 6 characters.'); return; }
    this.auth.resetUserPassword(u.id, pw).subscribe({
      next: () => alert(`Password reset for ${u.username}.`),
      error: (e) => alert(e?.error?.error || 'Reset failed'),
    });
  }

  remove(u: AppUser) {
    if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    this.auth.deleteUser(u.id).subscribe({
      next: () => this.reload(),
      error: (e) => alert(e?.error?.error || 'Delete failed'),
    });
  }
}
