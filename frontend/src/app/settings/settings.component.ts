import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SettingsService } from '../services/settings.service';
import { AuthService } from '../services/auth.service';
import { PaperSize, ShopSettings } from '../models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="header-bar">
      <h2 style="margin:0">Settings</h2>
    </div>

    <div *ngIf="!isAdmin()" class="panel warn">
      Only admins can change these settings. You can still view them.
    </div>

    <ng-container *ngIf="form() as f">
      <div class="grid-2">
        <div class="panel">
          <h3 style="margin-top:0">Shop identity</h3>
          <label>Shop name</label>
          <input [(ngModel)]="f.shop_name" [disabled]="!isAdmin()">

          <label>Address</label>
          <textarea rows="3" [(ngModel)]="f.address" [disabled]="!isAdmin()"></textarea>

          <div class="grid-2">
            <div>
              <label>Phone</label>
              <input [(ngModel)]="f.phone" [disabled]="!isAdmin()">
            </div>
            <div>
              <label>Email</label>
              <input [(ngModel)]="f.email" [disabled]="!isAdmin()">
            </div>
          </div>

          <div class="grid-2">
            <div>
              <label>GSTIN</label>
              <input [(ngModel)]="f.gstin" [disabled]="!isAdmin()">
            </div>
            <div>
              <label>Invoice prefix</label>
              <input [(ngModel)]="f.invoice_prefix" [disabled]="!isAdmin()"
                     maxlength="10" placeholder="INV">
            </div>
          </div>

          <label>Footer text (shown at the bottom of every bill)</label>
          <textarea rows="3" [(ngModel)]="f.footer_text" [disabled]="!isAdmin()"
                    placeholder="Thank You! Visit Again.&#10;Goods once sold cannot be exchanged or returned."></textarea>
          <p class="muted">One line per row — appears centered under the total.</p>
        </div>

        <div class="panel">
          <h3 style="margin-top:0">Printer</h3>
          <label>Default paper size</label>
          <select [(ngModel)]="f.default_paper_size" [disabled]="!isAdmin()">
            <option value="58mm">58 mm thermal</option>
            <option value="80mm">80 mm thermal</option>
            <option value="a4">A4</option>
          </select>
          <p class="muted">
            Every printed bill starts on this size; the user can still switch
            to another size before printing.
          </p>

          <h3>Logo</h3>
          <div class="logo-row">
            <div class="logo-preview">
              <img *ngIf="logoUrl() as url; else noLogo" [src]="url" alt="Shop logo">
              <ng-template #noLogo><span class="muted">No logo</span></ng-template>
            </div>
            <div style="flex:1">
              <input type="file" accept="image/*"
                     (change)="pickLogo($event)" [disabled]="!isAdmin() || uploading()">
              <p class="muted" style="margin-top:8px">
                PNG or JPG up to 2 MB. Appears on the printed bill header.
              </p>
              <button *ngIf="f.has_logo" class="danger" (click)="removeLogo()"
                      [disabled]="!isAdmin() || uploading()">
                Remove logo
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="panel" style="margin-top:12px; display:flex; justify-content:flex-end; gap:8px">
        <div *ngIf="msg()" class="msg" [class.err]="err()">{{ msg() }}</div>
        <button class="secondary" (click)="reload()">Reset</button>
        <button (click)="save()" [disabled]="!isAdmin() || saving()">
          {{ saving() ? 'Saving…' : 'Save settings' }}
        </button>
      </div>
    </ng-container>
  `,
  styles: [`
    .warn { background: #fef3c7; color: #92400e; margin-bottom: 12px; }
    .muted { color: var(--muted); font-size: 12px; }
    textarea { font-family: inherit; }
    .logo-row { display: flex; gap: 12px; align-items: flex-start; margin-top: 6px; }
    .logo-preview {
      width: 110px; height: 110px; border: 1px dashed var(--panel-border);
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      background: #fafafa; overflow: hidden;
    }
    .logo-preview img { max-width: 100%; max-height: 100%; }
    .msg     { margin-right: auto; color: var(--success); align-self: center; font-size: 13px; }
    .msg.err { color: var(--danger); }
  `],
})
export class SettingsComponent implements OnInit {
  private api = inject(SettingsService);
  private auth = inject(AuthService);

  form = signal<ShopSettings | null>(null);
  saving = signal(false);
  uploading = signal(false);
  msg = signal<string | null>(null);
  err = signal(false);

  isAdmin() { return this.auth.user()?.role === 'admin'; }

  ngOnInit() { this.reload(); }

  reload() {
    this.api.load().subscribe((s) => this.form.set({ ...s }));
  }

  logoUrl() {
    const f = this.form();
    return f ? this.api.logoUrl(f.has_logo, f.updated_at) : null;
  }

  save() {
    const f = this.form();
    if (!f) return;
    this.saving.set(true);
    this.err.set(false);
    this.msg.set(null);
    const { has_logo, updated_at, logo_mime, ...patch } = f;
    this.api.save(patch as Partial<ShopSettings>).subscribe({
      next: (s) => {
        this.form.set({ ...s });
        this.saving.set(false);
        this.msg.set('Settings saved.');
      },
      error: (e) => {
        this.saving.set(false);
        this.err.set(true);
        this.msg.set(e?.error?.error || 'Save failed');
      },
    });
  }

  pickLogo(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.err.set(false);
    this.msg.set(null);
    this.api.uploadLogo(file).subscribe({
      next: () => {
        this.uploading.set(false);
        this.msg.set('Logo uploaded.');
        input.value = '';
        this.reload();
      },
      error: (e) => {
        this.uploading.set(false);
        this.err.set(true);
        this.msg.set(e?.error?.error || 'Upload failed');
      },
    });
  }

  removeLogo() {
    if (!confirm('Remove the current logo?')) return;
    this.api.deleteLogo().subscribe(() => this.reload());
  }
}
