import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ApiService } from '../services/api.service';
import { DashboardSummary } from '../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  template: `
    <div class="header-bar">
      <h2 style="margin:0">Dashboard</h2>
      <a class="btn" routerLink="/invoices/new">+ New Invoice</a>
    </div>

    <div class="grid-3">
      <div class="panel">
        <div class="stat-label">Today's sales</div>
        <div class="stat-value">{{ (summary()?.totalSales || 0) | currency:'INR':'symbol':'1.0-2' }}</div>
      </div>
      <div class="panel">
        <div class="stat-label">Invoices today</div>
        <div class="stat-value">{{ summary()?.invoiceCount || 0 }}</div>
      </div>
      <div class="panel">
        <div class="stat-label">Low stock products</div>
        <div class="stat-value">{{ summary()?.lowStock?.length || 0 }}</div>
      </div>
    </div>

    <div class="panel" style="margin-top:16px" *ngIf="(summary()?.lowStock?.length ?? 0) > 0">
      <h3 style="margin-top:0">Low stock alert</h3>
      <table class="table">
        <thead>
          <tr><th>Product</th><th class="right">Stock left</th><th>Unit</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of summary()?.lowStock">
            <td>{{ p.name }}</td>
            <td class="right"><span class="tag warn">{{ p.stock }}</span></td>
            <td>{{ p.unit }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .stat-label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
    .stat-value { font-size: 26px; font-weight: 700; margin-top: 6px; }
  `],
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  summary = signal<DashboardSummary | null>(null);

  ngOnInit() {
    this.api.dashboard().subscribe((s) => this.summary.set(s));
  }
}
