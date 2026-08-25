import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api.service';
import { MiniChartComponent, ChartPoint } from '../charts/mini-chart.component';
import { ReportPeriod, SalesReport } from '../models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe, DecimalPipe, MiniChartComponent],
  template: `
    <div class="header-bar">
      <h2 style="margin:0">Sales Report</h2>
      <div style="display:flex; gap:8px">
        <button class="secondary no-print" (click)="exportCSV()" [disabled]="!report()">⬇ CSV</button>
        <button class="secondary no-print" (click)="print()">🖨 Print</button>
      </div>
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
      <!-- ---------- KPI tiles ---------- -->
      <div class="tiles" style="margin-bottom:12px">
        <div class="tile">
          <div class="lbl">Total sales</div>
          <div class="val">{{ r.totals.sales | currency:'INR':'symbol':'1.0-2' }}</div>
        </div>
        <div class="tile">
          <div class="lbl">Invoices</div>
          <div class="val">{{ r.totals.invoices }}</div>
        </div>
        <div class="tile">
          <div class="lbl">Items sold</div>
          <div class="val">{{ r.totals.items_sold | number:'1.0-2' }}</div>
        </div>
        <div class="tile">
          <div class="lbl">Avg bill</div>
          <div class="val">{{ r.totals.avg_bill | currency:'INR':'symbol':'1.0-2' }}</div>
        </div>
        <div class="tile">
          <div class="lbl">GST collected</div>
          <div class="val">{{ r.totals.gst | currency:'INR':'symbol':'1.0-2' }}</div>
        </div>
      </div>

      <!-- ---------- Chart ---------- -->
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
        <div *ngIf="r.buckets.length === 0" class="empty">No sales in this range.</div>
      </div>

      <!-- ---------- Data grid: breakdown by bucket ---------- -->
      <div class="panel" style="margin-bottom:12px">
        <div class="chart-head" style="margin-bottom:8px">
          <h3 style="margin:0">Breakdown</h3>
          <span class="muted">{{ r.buckets.length }} {{ bucketColumnLabel().toLowerCase() }}s</span>
        </div>
        <div class="grid-wrap">
          <table class="data-grid">
            <thead>
              <tr>
                <th class="grow">{{ bucketColumnLabel() }}</th>
                <th class="right">Invoices</th>
                <th class="right">Items sold</th>
                <th class="right">Avg bill</th>
                <th class="right">GST</th>
                <th class="right">Sales</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let b of r.buckets; let i = index" [class.alt]="i % 2 === 1">
                <td class="grow">{{ formatBucket(b.bucket) }}</td>
                <td class="right">{{ b.invoices }}</td>
                <td class="right">{{ b.items_sold | number:'1.0-2' }}</td>
                <td class="right">{{ avgBill(b) | currency:'INR':'symbol':'1.0-2' }}</td>
                <td class="right">{{ b.gst | currency:'INR':'symbol':'1.2-2' }}</td>
                <td class="right amt">{{ b.sales | currency:'INR':'symbol':'1.2-2' }}</td>
              </tr>
              <tr *ngIf="r.buckets.length === 0">
                <td colspan="6" class="empty">No data</td>
              </tr>
            </tbody>
            <tfoot *ngIf="r.buckets.length">
              <tr>
                <td>Total</td>
                <td class="right">{{ r.totals.invoices }}</td>
                <td class="right">{{ r.totals.items_sold | number:'1.0-2' }}</td>
                <td class="right">{{ r.totals.avg_bill | currency:'INR':'symbol':'1.0-2' }}</td>
                <td class="right">{{ r.totals.gst | currency:'INR':'symbol':'1.2-2' }}</td>
                <td class="right amt">{{ r.totals.sales | currency:'INR':'symbol':'1.2-2' }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- ---------- GST by rate + top products ---------- -->
      <div class="grid-2">
        <div class="panel">
          <h3 style="margin-top:0">GST by rate</h3>
          <table class="data-grid">
            <thead>
              <tr>
                <th>Rate</th>
                <th class="right">Taxable value</th>
                <th class="right">GST amount</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let g of r.gstByRate; let i = index" [class.alt]="i % 2 === 1">
                <td>{{ g.rate }}%</td>
                <td class="right">{{ g.taxable | currency:'INR':'symbol':'1.2-2' }}</td>
                <td class="right amt">{{ g.amount | currency:'INR':'symbol':'1.2-2' }}</td>
              </tr>
              <tr *ngIf="r.gstByRate.length === 0">
                <td colspan="3" class="empty">No taxable sales</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="panel">
          <h3 style="margin-top:0">Top products</h3>
          <table class="data-grid">
            <thead>
              <tr>
                <th class="grow">Product</th>
                <th class="right">Qty sold</th>
                <th class="right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of r.topProducts; let i = index" [class.alt]="i % 2 === 1">
                <td class="grow">{{ p.name }}</td>
                <td class="right">{{ p.qty | number:'1.0-2' }}</td>
                <td class="right amt">{{ p.amount | currency:'INR':'symbol':'1.2-2' }}</td>
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
    .tiles { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
    @media (max-width: 900px) { .tiles { grid-template-columns: repeat(2, 1fr); } }
    .tile { background: var(--panel); border: 1px solid var(--panel-border);
            border-radius: 10px; padding: 12px 14px; box-shadow: var(--shadow); }
    .lbl  { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
    .val  { font-size: 20px; font-weight: 700; margin-top: 4px; }

    .chart-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
    .chart-toggle button { padding: 4px 10px; font-size: 12px; }
    .chart-toggle button + button { margin-left: 4px; }
    .muted { color: var(--muted); font-size: 12px; }
    .empty { text-align: center; color: var(--muted); padding: 16px; }

    /* ---------- data grid ---------- */
    .grid-wrap { overflow-x: auto; max-height: 60vh; overflow-y: auto; border-radius: 8px; }
    table.data-grid {
      width: 100%; border-collapse: separate; border-spacing: 0;
      font-variant-numeric: tabular-nums;
    }
    .data-grid th {
      position: sticky; top: 0; z-index: 1;
      background: #f9fafb;
      text-align: left; font-size: 11px; letter-spacing: .05em;
      text-transform: uppercase; color: var(--muted);
      padding: 8px 10px; border-bottom: 1px solid var(--panel-border);
    }
    .data-grid td {
      padding: 8px 10px; border-bottom: 1px solid #f3f4f6;
    }
    .data-grid tr.alt td { background: #fafbff; }
    .data-grid tr:hover td { background: #eef2ff; }
    .data-grid .right { text-align: right; }
    .data-grid .amt   { font-weight: 600; }
    .data-grid .grow  { min-width: 140px; }
    .data-grid tfoot td {
      font-weight: 700; background: #f3f4f6;
      border-top: 2px solid var(--panel-border);
      position: sticky; bottom: 0;
    }
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

  avgBill(b: { sales: number; invoices: number }) {
    return b.invoices ? b.sales / b.invoices : 0;
  }

  bucketColumnLabel() {
    return { daily: 'Day', weekly: 'Week', monthly: 'Month',
             yearly: 'Year', custom: 'Day' }[this.period];
  }

  formatBucket(b: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(b)) return new Date(b).toLocaleDateString(undefined,
      { day: '2-digit', month: 'short', year: 'numeric' });
    if (/^\d{4}-\d{2}$/.test(b)) {
      const [y, m] = b.split('-'); return new Date(+y, +m - 1).toLocaleDateString(undefined,
        { month: 'short', year: 'numeric' });
    }
    return b;
  }

  formatBucketShort(b: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(b)) return b.slice(5);
    if (/^\d{4}-\d{2}$/.test(b)) {
      const [y, m] = b.split('-');
      return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short' });
    }
    if (/^\d{4}-W\d{2}$/.test(b)) return b.split('-')[1] || b;
    return b;
  }

  exportCSV() {
    const r = this.report();
    if (!r) return;
    const rows = [
      [this.bucketColumnLabel(), 'Invoices', 'Items sold', 'Avg bill', 'GST', 'Sales'],
      ...r.buckets.map((b) => [
        this.formatBucket(b.bucket),
        b.invoices,
        b.items_sold.toFixed(2),
        this.avgBill(b).toFixed(2),
        b.gst.toFixed(2),
        b.sales.toFixed(2),
      ]),
      ['Total', r.totals.invoices, r.totals.items_sold.toFixed(2),
       r.totals.avg_bill.toFixed(2), r.totals.gst.toFixed(2), r.totals.sales.toFixed(2)],
    ];
    const csv = rows.map((r) => r.map((c) => {
      const s = String(c);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-${r.period}-${r.from}-to-${r.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  print() { window.print(); }
}
