import { Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../services/api.service';
import { SettingsService } from '../services/settings.service';
import { Invoice, PaperSize, ShopSettings } from '../models';

@Component({
  selector: 'app-invoice-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe],
  template: `
    <div class="header-bar no-print">
      <a class="btn secondary" routerLink="/invoices">← Back</a>
      <div style="display:flex; gap:8px; align-items:center">
        <label style="margin:0">Paper</label>
        <select [(ngModel)]="size" (ngModelChange)="applyPageStyle($event)">
          <option value="58mm">58 mm thermal</option>
          <option value="80mm">80 mm thermal</option>
          <option value="a4">A4</option>
        </select>
        <button (click)="print()">🖨 Print</button>
      </div>
    </div>

    <ng-container *ngIf="invoice() as inv">
      <div class="invoice-doc" [class.size-58mm]="size === '58mm'"
                               [class.size-80mm]="size === '80mm'"
                               [class.size-a4]="size === 'a4'">

        <!-- === Thermal (58 / 80 mm) — "sleek bill" style === -->
        <ng-container *ngIf="size !== 'a4'">
          <div class="th-card">
            <div class="th-corner"></div>

            <div class="th-head">
              <img *ngIf="logoUrl()" [src]="logoUrl()!" class="th-logo" alt="">
              <div class="th-name">{{ shop()?.shop_name || 'Textiles Shop' }}</div>
              <div class="th-sub" *ngIf="shop()?.address">{{ shop()?.address }}</div>
              <div class="th-sub" *ngIf="shop()?.phone">PHONE : {{ shop()?.phone }}</div>
              <div class="th-sub" *ngIf="shop()?.gstin">GSTIN : {{ shop()?.gstin }}</div>
            </div>

            <div class="th-hr solid"></div>

            <div class="th-meta">
              <span><b>Bill No:</b> {{ inv.invoice_no }}</span>
              <span><b>Date:</b> {{ inv.invoice_date | date:'dd - MMM - y' }}</span>
            </div>

            <div class="th-hr solid"></div>

            <table class="th-table">
              <thead>
                <tr>
                  <th class="c-sn">SN</th>
                  <th class="c-item">Item</th>
                  <th class="c-qty">Qty</th>
                  <th class="c-price">Price</th>
                  <th class="c-amt">Amt</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let it of inv.items; let i = index">
                  <td class="c-sn">{{ i + 1 }}</td>
                  <td class="c-item">{{ it.name }}</td>
                  <td class="c-qty">{{ it.qty }}</td>
                  <td class="c-price">{{ it.price | number:'1.2-2' }}</td>
                  <td class="c-amt">{{ it.amount | number:'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>

            <div class="th-hr solid"></div>

            <div class="th-subtotal">
              <span class="l">Subtotal</span>
              <span class="q">{{ totalItems() }}</span>
              <span class="p"></span>
              <span class="a">₹ {{ inv.subtotal | number:'1.2-2' }}</span>
            </div>

            <div class="th-hr solid"></div>

            <div class="th-gst-block">
              <div class="th-gst-row" *ngFor="let g of gstByRate()">
                <span>{{ gstLabel }} at {{ g.rate }}%</span>
                <span>{{ g.amount | number:'1.2-2' }}</span>
              </div>
              <div class="th-gst-row" *ngIf="inv.discount">
                <span>Discount</span>
                <span>− {{ inv.discount | number:'1.2-2' }}</span>
              </div>
            </div>

            <div class="th-hr solid"></div>

            <div class="th-grand">
              <span>TOTAL</span>
              <span>₹ {{ inv.grand_total | number:'1.2-2' }}</span>
            </div>

            <div class="th-hr dashed-lg"></div>

            <div class="th-foot">
              {{ shop()?.footer_text || 'Thank You' }}
            </div>
          </div>
        </ng-container>

        <!-- === A4 === -->
        <ng-container *ngIf="size === 'a4'">
          <header class="doc-head">
            <div style="display:flex; gap:14px; align-items:flex-start">
              <img *ngIf="logoUrl()" [src]="logoUrl()!" class="a4-logo" alt="">
              <div>
                <div class="shop-name">{{ shop()?.shop_name || 'Textiles Shop' }}</div>
                <div class="shop-addr">
                  <span *ngIf="shop()?.address">{{ shop()?.address }}<br></span>
                  <span *ngIf="shop()?.gstin">GSTIN: {{ shop()?.gstin }} · </span>
                  <span *ngIf="shop()?.phone">{{ shop()?.phone }}</span>
                  <span *ngIf="shop()?.email"> · {{ shop()?.email }}</span>
                </div>
              </div>
            </div>
            <div class="right">
              <div class="doc-title">TAX INVOICE</div>
              <div><strong>{{ inv.invoice_no }}</strong></div>
              <div>Date: {{ inv.invoice_date | date:'mediumDate' }}</div>
              <div>Payment: {{ inv.payment_mode }}</div>
            </div>
          </header>

          <section class="bill-to">
            <div class="section-label">Bill to</div>
            <div class="c-name">{{ inv.customer_name }}</div>
            <div *ngIf="inv.customer_phone">Phone: {{ inv.customer_phone }}</div>
            <div *ngIf="inv.customer_gstin">GSTIN: {{ inv.customer_gstin }}</div>
            <div *ngIf="inv.customer_address">{{ inv.customer_address }}</div>
          </section>

          <table class="table">
            <thead>
              <tr>
                <th>#</th><th>Item</th><th>HSN</th>
                <th class="right">Qty</th><th class="right">Rate</th>
                <th class="right">GST%</th><th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let it of inv.items; let i = index">
                <td>{{ i + 1 }}</td>
                <td>{{ it.name }}</td>
                <td>{{ it.hsn || '—' }}</td>
                <td class="right">{{ it.qty }} {{ it.unit }}</td>
                <td class="right">{{ it.price | currency:'INR':'symbol':'1.2-2' }}</td>
                <td class="right">{{ it.gst }}%</td>
                <td class="right">{{ it.amount | currency:'INR':'symbol':'1.2-2' }}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr><td>Sub-total</td>
                  <td class="right">{{ inv.subtotal | currency:'INR':'symbol':'1.2-2' }}</td></tr>
              <tr><td>GST</td>
                  <td class="right">{{ inv.gst_total | currency:'INR':'symbol':'1.2-2' }}</td></tr>
              <tr *ngIf="inv.discount"><td>Discount</td>
                  <td class="right">− {{ inv.discount | currency:'INR':'symbol':'1.2-2' }}</td></tr>
              <tr class="grand"><td>Grand total</td>
                  <td class="right">{{ inv.grand_total | currency:'INR':'symbol':'1.2-2' }}</td></tr>
            </table>
          </div>

          <footer class="doc-foot">
            <p *ngIf="inv.notes"><strong>Notes:</strong> {{ inv.notes }}</p>
            <p>{{ shop()?.footer_text || 'Thank you for your purchase!' }}</p>
          </footer>
        </ng-container>
      </div>
    </ng-container>
  `,
  styles: [`
    /* ---------- On-screen preview widths ---------- */
    .invoice-doc { margin: 0 auto; background: #fff;
                   box-shadow: 0 1px 3px rgba(0,0,0,.08);
                   border: 1px solid var(--panel-border); }
    .invoice-doc.size-58mm { width: 58mm; padding: 3mm; font-family: 'Courier New', monospace; }
    .invoice-doc.size-80mm { width: 80mm; padding: 4mm; font-family: 'Courier New', monospace; }
    .invoice-doc.size-a4   { width: 210mm; max-width: 100%; padding: 12mm; }

    /* ---------- Thermal (both 58 & 80) — "sleek bill" ---------- */
    .invoice-doc.size-58mm { font-size: 10px;   line-height: 1.35;
                             font-family: 'Segoe UI', system-ui, sans-serif; }
    .invoice-doc.size-80mm { font-size: 12px;   line-height: 1.4;
                             font-family: 'Segoe UI', system-ui, sans-serif; }
    .invoice-doc.size-58mm, .invoice-doc.size-80mm { color: #111; padding: 0; }

    /* Outer dashed frame that matches the reference bill. */
    .th-card {
      position: relative;
      border: 1.5px dashed #111;
      padding: 4mm 3.5mm 3mm;
      background: #fff;
    }

    /* Small dark-blue corner accent, top-left. */
    .th-corner {
      position: absolute;
      top: 0; left: 0;
      width: 8mm; height: 8mm;
      background: #1e3a8a;
      clip-path: polygon(0 0, 100% 0, 0 100%);
    }

    .th-head   { text-align: center; padding-top: 2mm; }
    .th-logo   { max-width: 40%; max-height: 12mm; margin: 0 auto 1mm; display: block; }
    .th-name   {
      color: #1e3a8a;
      font-weight: 800; font-size: 1.6em;
      letter-spacing: 1px;
      margin-bottom: 1.5mm;
    }
    .th-sub    { font-size: 0.95em; margin-top: 0.5mm; }

    .th-hr             { border-top: 1px dashed #666; margin: 2mm 0; }
    .th-hr.solid       { border-top: 1px solid #333; }
    .th-hr.dashed-lg   { border-top: 1.5px dashed #333; margin: 2.5mm 0 2mm; }

    .th-meta   {
      display: flex; justify-content: space-between;
      font-size: 0.95em;
    }

    /* --- item grid: SN | Item | Qty | Price | Amt --- */
    .th-table  { width: 100%; border-collapse: collapse;
                 font-variant-numeric: tabular-nums; }
    .th-table th, .th-table td {
      padding: 1.5mm 1mm;
      vertical-align: top;
    }
    .th-table th {
      text-align: left; font-weight: 700;
      border-bottom: 0.5px solid #666;
    }
    .th-table .c-sn    { width: 8%; }
    .th-table .c-item  { width: 40%; word-break: break-word; }
    .th-table .c-qty   { width: 10%; text-align: center; }
    .th-table .c-price { width: 21%; text-align: right; }
    .th-table .c-amt   { width: 21%; text-align: right; font-weight: 600; }
    .th-table th.c-qty, .th-table th.c-price, .th-table th.c-amt {
      text-align: inherit;
    }
    .th-table th.c-qty   { text-align: center; }
    .th-table th.c-price { text-align: right; }
    .th-table th.c-amt   { text-align: right; }

    /* --- Subtotal row: label, item count, blank, amount --- */
    .th-subtotal {
      display: grid;
      grid-template-columns: 48% 10% 21% 21%;
      align-items: center;
      font-weight: 700;
      padding: 1mm 1mm;
      font-variant-numeric: tabular-nums;
    }
    .th-subtotal .l { text-align: left; }
    .th-subtotal .q { text-align: center; }
    .th-subtotal .a { text-align: right; }

    /* --- Per-rate GST block, right aligned --- */
    .th-gst-block { padding: 1mm 1mm; }
    .th-gst-row {
      display: flex; justify-content: flex-end; gap: 6mm;
      padding: 0.5mm 0;
      font-variant-numeric: tabular-nums;
    }
    .th-gst-row > :first-child { color: #333; }

    /* --- Grand total --- */
    .th-grand {
      display: flex; justify-content: space-between; align-items: baseline;
      font-weight: 800; font-size: 1.15em;
      padding: 1mm 1mm;
      font-variant-numeric: tabular-nums;
    }

    .th-foot {
      text-align: center; padding: 1mm 0 0;
      font-weight: 600; font-style: italic;
    }

    /* ---------- A4 ---------- */
    .doc-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px;
    }
    .a4-logo    { max-width: 90px; max-height: 90px; object-fit: contain; }
    .shop-name  { font-size: 20px; font-weight: 700; }
    .shop-addr  { color: var(--muted); font-size: 12px; margin-top: 2px; line-height: 1.5; }
    .doc-title  { font-size: 22px; font-weight: 800; letter-spacing: .05em; color: var(--primary); }
    .bill-to    { margin-bottom: 12px; }
    .section-label { font-size: 11px; text-transform: uppercase;
                     letter-spacing: .05em; color: var(--muted); }
    .c-name     { font-weight: 600; font-size: 16px; margin-top: 2px; }
    .totals     { display: flex; justify-content: flex-end; margin-top: 16px; }
    .totals table { min-width: 280px; }
    .totals td  { padding: 4px 8px; }
    .totals tr.grand { font-weight: 700; font-size: 16px;
                       border-top: 1px solid var(--panel-border); }
    .doc-foot   { margin-top: 24px; color: var(--muted); font-size: 12px; }

    /* ---------- Print ---------- */
    @media print {
      .invoice-doc { box-shadow: none; border: none; }
    }
  `],
})
export class InvoiceViewComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private settingsSvc = inject(SettingsService);

  @Input() id!: string;

  invoice = signal<Invoice | null>(null);
  shop = signal<ShopSettings | null>(null);
  size: PaperSize = 'a4';

  ngOnInit() {
    this.applyPageStyle(this.size);
    this.api.getInvoice(+this.id).subscribe((inv) => this.invoice.set(inv));
    this.settingsSvc.load().subscribe((s) => {
      this.shop.set(s);
      this.size = s.default_paper_size;
      this.applyPageStyle(this.size);
    });
  }

  ngOnDestroy() {
    document.getElementById('print-page-style')?.remove();
  }

  logoUrl() {
    const s = this.shop();
    return s ? this.settingsSvc.logoUrl(s.has_logo, s.updated_at) : null;
  }

  /**
   * IGST when customer is out-of-state (different GSTIN state code),
   * CGST + SGST when intra-state. We surface the label from a simple
   * heuristic: if both customer and shop have GSTIN and their first
   * two digits (state code) match, split as CGST/SGST; otherwise IGST.
   */
  get gstLabel(): string {
    const shop = this.shop();
    const inv = this.invoice();
    const shopSt = (shop?.gstin || '').slice(0, 2);
    const custSt = (inv?.customer_gstin || '').slice(0, 2);
    if (shopSt && custSt && shopSt === custSt) return 'GST';
    return 'IGST';
  }

  totalItems(): number {
    const inv = this.invoice();
    if (!inv?.items) return 0;
    return inv.items.reduce((s, it) => s + (+it.qty || 0), 0);
  }

  /** GST amount grouped by rate. */
  gstByRate(): Array<{ rate: number; amount: number }> {
    const inv = this.invoice();
    if (!inv?.items) return [];
    const map = new Map<number, number>();
    for (const it of inv.items) {
      const rate = +it.gst || 0;
      const amt = ((+it.qty || 0) * (+it.price || 0) * rate) / 100;
      map.set(rate, (map.get(rate) || 0) + amt);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rate, amount]) => ({ rate, amount }));
  }

  /** @page rules ignore CSS selectors, so we swap a top-level <style>. */
  applyPageStyle(size: PaperSize) {
    const map: Record<PaperSize, string> = {
      '58mm': '@media print { @page { size: 58mm auto; margin: 2mm; } body { margin: 0; } }',
      '80mm': '@media print { @page { size: 80mm auto; margin: 3mm; } body { margin: 0; } }',
      'a4':   '@media print { @page { size: A4;        margin: 12mm; } body { margin: 0; } }',
    };
    let tag = document.getElementById('print-page-style') as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement('style');
      tag.id = 'print-page-style';
      document.head.appendChild(tag);
    }
    tag.textContent = map[size];
  }

  print() { window.print(); }
}
