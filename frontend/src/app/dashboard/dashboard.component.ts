import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ApiService } from '../services/api.service';
import { MiniChartComponent, ChartPoint } from '../charts/mini-chart.component';
import { DashboardSummary, DashboardTrend } from '../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, MiniChartComponent],
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

    <div class="grid-2" style="margin-top:12px">
      <div class="panel">
        <div class="chart-head">
          <h3 style="margin:0">Revenue (last 14 days)</h3>
          <a routerLink="/reports">Full report →</a>
        </div>
        <app-mini-chart [data]="revenueSeries()" type="bar" [height]="220"
                        color="#4f46e5" valuePrefix="₹"></app-mini-chart>
      </div>

      <div class="panel">
        <div class="chart-head">
          <h3 style="margin:0">Invoices per day</h3>
          <span class="muted">{{ totalInvoices14() }} in 14 days</span>
        </div>
        <app-mini-chart [data]="invoicesSeries()" type="line" [height]="220"
                        color="#059669"></app-mini-chart>
      </div>
    </div>

    <div class="panel" style="margin-top:12px" *ngIf="(summary()?.lowStock?.length ?? 0) > 0">
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
    .chart-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .muted { color: var(--muted); font-size: 12px; }
  `],
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);

  summary = signal<DashboardSummary | null>(null);
  trend = signal<DashboardTrend | null>(null);

  revenueSeries = computed<ChartPoint[]>(() =>
    (this.trend()?.buckets || []).map((b) => ({
      label: this.shortDate(b.bucket),
      value: b.sales,
    })));

  invoicesSeries = computed<ChartPoint[]>(() =>
    (this.trend()?.buckets || []).map((b) => ({
      label: this.shortDate(b.bucket),
      value: b.invoices,
    })));

  totalInvoices14 = computed(() =>
    (this.trend()?.buckets || []).reduce((s, b) => s + b.invoices, 0));

  ngOnInit() {
    this.api.dashboard().subscribe((s) => this.summary.set(s));
    this.api.dashboardTrend().subscribe((t) => this.trend.set(t));
  }

  private shortDate(iso: string): string {
    // "2026-08-25" → "25/8"
    const [, m, d] = iso.split('-');
    return `${+d}/${+m}`;
  }
}
