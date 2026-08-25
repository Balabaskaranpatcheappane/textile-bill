import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api.service';
import { MiniChartComponent, ChartPoint } from '../charts/mini-chart.component';
import { ReportPeriod, SalesReport } from '../models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe, MiniChartComponent],
  template: `
    <div class="header-bar">
      <h2 style="margin:0">Sales Report</h2>
      <button class="secondary no-print" (click)="print()">🖨 Print</button>
    </div>

    <div class="panel no-print" style="margin-bottom:12px">
      <div class="row">
        <div>
          <label>Period</label>
          <select [(ngModel)]="period" (ngModelChange)="run()">
            <option value="daily">Daily (last 14 days)</option>
            <option value="weekly">Weekly (last 12 weeks)</option>
            <option value="monthly">Monthly (last 12 months)</option>
            <option value="yearly">Yearly (last 5 years)</option>
            <option value="custom">Custom date range</option>
          </select>
        </div>
        <div *ngIf="period === 'custom'">
          <label>From</label>
          <input type="date" [(ngModel)]="from">
        </div>
        <div *ngIf="period === 'custom'">
          <label>To</label>
          <input type="date" [(ngModel)]="to">
        </div>
        <div *ngIf="period === 'custom'" style="flex:0 0 auto; align-self:flex-end">
          <button (click)="run()" [disabled]="!from || !to">Run</button>
        </div>
      </div>
    </div>

    <ng-container *ngIf="report() as r">
      <div class="grid-3" style="margin-bottom:12px">
        <div class="panel"><div class="lbl">Total sales</div>
          <div class="val">{{ r.totals.sales | currency:'INR':'symbol':'1.0-2' }}</div></div>
        <div class="panel"><div class="lbl">Invoices</div>
          <div class="val">{{ r.totals.invoices }}</div></div>
        <div class="panel"><div class="lbl">Average bill</div>
          <div class="val">{{ r.totals.avg_bill | currency:'INR':'symbol':'1.0-2' }}</div></div>
      </div>

      <div class="panel" style="margin-bottom:12px">
        <div class="chart-head">
          <h3 style="margin:0">Sales — {{ r.from | date:'mediumDate' }} to {{ r.to | date:'mediumDate' }}</h3>
          <div class="chart-toggle">
            <button [class.secondary]="chartType() !== 'bar'"  (click)="chartType.set('bar')">Bar</button>
            <button [class.secondary]="chartType() !== 'line'" (click)="chartType.set('line')">Line</button>
          </div>
        </div>
        <app-mini-chart [data]="chartData()" [type]="chartType()" [height]="260"
                        color="#4f46e5" valuePrefix="₹"></app-mini-chart>
        <div *ngIf="r.buckets.length === 0" class="empty">
          No sales in this range.
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <h3 style="margin-top:0">Breakdown</h3>
          <table class="table">
            <thead>
              <tr><th>{{ bucketColumnLabel() }}</th>
                  <th class="right">Invoices</th>
                  <th class="right">GST</th>
                  <th class="right">Sales</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let b of r.buckets">
                <td>{{ formatBucket(b.bucket) }}</td>
                <td class="right">{{ b.invoices }}</td>
                <td class="right">{{ b.gst   | currency:'INR':'symbol':'1.2-2' }}</td>
                <td class="right">{{ b.sales | currency:'INR':'symbol':'1.2-2' }}</td>
              </tr>
              <tr *ngIf="r.buckets.length === 0">
                <td colspan="4" class="empty">No data</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="panel">
          <h3 style="margin-top:0">Top products</h3>
          <table class="table">
            <thead>
              <tr><th>Product</th>
                  <th class="right">Qty sold</th>
                  <th class="right">Revenue</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of r.topProducts">
                <td>{{ p.name }}</td>
                <td class="right">{{ p.qty | number:'1.0-2' }}</td>
                <td class="right">{{ p.amount | currency:'INR':'symbol':'1.2-2' }}</td>
              </tr>
              <tr *ngIf="r.topProducts.length === 0">
                <td colspan="3" class="empty">No sales in this range</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .lbl { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
    .val { font-size: 22px; font-weight: 700; margin-top: 4px; }
    .chart-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
    .chart-toggle button { padding: 4px 10px; font-size: 12px; }
    .chart-toggle button + button { margin-left: 4px; }
    .empty { text-align: center; color: var(--muted); padding: 16px; }
  `],
})
export class ReportsComponent implements OnInit {
  private api = inject(ApiService);

  period: ReportPeriod = 'daily';
  from = '';
  to = '';

  report = signal<SalesReport | null>(null);
  chartType = signal<'bar' | 'line'>('bar');

  chartData = computed<ChartPoint[]>(() => {
    const r = this.report();
    if (!r) return [];
    return r.buckets.map((b) => ({
      label: this.formatBucketShort(b.bucket),
      value: b.sales,
    }));
  });

  ngOnInit() {
    // Default the custom range to the last 30 days for convenience.
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 29);
    this.to   = today.toISOString().slice(0, 10);
    this.from = past.toISOString().slice(0, 10);
    this.run();
  }

  run() {
    this.api.salesReport(this.period, this.from, this.to).subscribe((r) => this.report.set(r));
  }

  bucketColumnLabel() {
    return { daily: 'Day', weekly: 'Week', monthly: 'Month',
             yearly: 'Year', custom: 'Day' }[this.period];
  }

  formatBucket(b: string): string {
    // Formats used in server SQL:
    //   daily/custom : YYYY-MM-DD    → 25 Aug 2026
    //   weekly       : IYYY-"W"IW    → 2026-W34
    //   monthly      : YYYY-MM       → Aug 2026
    //   yearly       : YYYY          → 2026
    if (/^\d{4}-\d{2}-\d{2}$/.test(b)) return new Date(b).toLocaleDateString(undefined,
      { day: '2-digit', month: 'short', year: 'numeric' });
    if (/^\d{4}-\d{2}$/.test(b)) {
      const [y, m] = b.split('-'); return new Date(+y, +m - 1).toLocaleDateString(undefined,
        { month: 'short', year: 'numeric' });
    }
    return b;
  }

  formatBucketShort(b: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(b)) return b.slice(5);          // MM-DD
    if (/^\d{4}-\d{2}$/.test(b)) {
      const [y, m] = b.split('-');
      return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short' });
    }
    if (/^\d{4}-W\d{2}$/.test(b)) return b.split('-')[1];          // W34
    return b;                                                       // year
  }

  print() { window.print(); }
}
