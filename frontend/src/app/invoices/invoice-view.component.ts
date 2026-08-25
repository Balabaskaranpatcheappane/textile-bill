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

        <!-- === Thermal (58 / 80 mm) — monospaced receipt === -->
        <ng-container *ngIf="size !== 'a4'">
          <div class="th-card">
            <div class="th-head">
              <img *ngIf="logoUrl()" [src]="logoUrl()!" class="th-logo" alt="">
              <div class="th-name">{{ shop()?.shop_name || 'Textiles Shop' }}</div>
              <div class="th-sub" *ngIf="shop()?.address">{{ shop()?.address }}</div>
              <div class="th-sub" *ngIf="shop()?.phone || shop()?.gstin">
                <ng-container *ngIf="shop()?.phone">Ph: {{ shop()?.phone }}</ng-container>
                <ng-container *ngIf="shop()?.phone && shop()?.gstin">, </ng-container>
                <ng-container *ngIf="shop()?.gstin">{{ shop()?.gstin }}</ng-container>
              </div>
            </div>

            <div class="th-hr"></div>

            <div class="th-meta-row">
              <span>Bill No: {{ inv.invoice_no }}</span>
              <span>Date: {{ inv.invoice_date | date:'dd/MM/yyyy' }}</span>
            </div>
            <div class="th-meta-row">
              <span>Customer: {{ inv.customer_name }}</span>
              <span>Time: {{ (inv.created_at || inv.invoice_date) | date:'HH:mm' }}</span>
            </div>

            <div class="th-hr"></div>

            <table class="th-table">
              <colgroup>
                <col class="c-item">
                <col class="c-qty">
                <col class="c-rate">
                <col class="c-tot">
              </colgroup>
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th class="cell-right">Qty</th>
                  <th class="cell-right">Rate</th>
                  <th class="cell-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let it of inv.items">
                  <td class="cell-wrap">{{ it.name }}</td>
                  <td class="cell-right">{{ it.qty }}</td>
                  <td class="cell-right cell-nowrap">{{ it.price | number:'1.2-2' }}</td>
                  <td class="cell-right cell-nowrap">{{ (it.qty * it.price) | number:'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>

            <div class="th-hr"></div>

            <!-- Totals block: label left, amount right -->
            <div class="th-tot-row">
              <span>Subtotal:</span>
              <span class="cell-nowrap">{{ inv.subtotal | number:'1.2-2' }}</span>
            </div>
            <div class="th-tot-row" *ngIf="inv.discount">
              <span>Discount:</span>
              <span class="cell-nowrap">− {{ inv.discount | number:'1.2-2' }}</span>
            </div>

            <!-- Intra-state → split CGST + SGST; inter-state → IGST -->
            <ng-container *ngIf="isIntraState()">
              <div class="th-tot-row" *ngFor="let g of gstByRate()">
                <span>CGST ({{ g.rate / 2 | number:'1.0-2' }}%):</span>
                <span class="cell-nowrap">{{ g.amount / 2 | number:'1.2-2' }}</span>
              </div>
              <div class="th-tot-row" *ngFor="let g of gstByRate()">
                <span>SGST ({{ g.rate / 2 | number:'1.0-2' }}%):</span>
                <span class="cell-nowrap">{{ g.amount / 2 | number:'1.2-2' }}</span>
              </div>
            </ng-container>
            <ng-container *ngIf="!isIntraState()">
              <div class="th-tot-row" *ngFor="let g of gstByRate()">
                <span>IGST ({{ g.rate }}%):</span>
                <span class="cell-nowrap">{{ g.amount | number:'1.2-2' }}</span>
              </div>
            </ng-container>

            <div class="th-hr"></div>

            <div class="th-tot-row th-grand">
              <span>TOTAL AMOUNT:</span>
              <span class="cell-nowrap">{{ inv.grand_total | number:'1.2-2' }}</span>
            </div>

            <div class="th-hr"></div>

            <div class="th-info-row">Payment Mode: {{ inv.payment_mode }}</div>
            <div class="th-info-row" *ngIf="hsnSummary() as hsn">
              HSN Summary: {{ hsn }}
            </div>

            <div class="th-hr"></div>

            <div class="th-foot">
              <div class="th-foot-line" *ngFor="let l of footerLines()">{{ l }}</div>
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

    /* ---------- Thermal (both 58 & 80) — monospaced receipt ---------- */
    .invoice-doc.size-58mm, .invoice-doc.size-80mm {
      color: #000;
      font-family: 'Consolas', 'Menlo', 'Courier New', ui-monospace, monospace;
      font-variant-numeric: tabular-nums;
    }
    .invoice-doc.size-58mm { font-size: 10.5px; line-height: 1.4; }
    .invoice-doc.size-80mm { font-size: 12px;   line-height: 1.45; }

    .th-card {
      padding: 3mm 3mm;
      background: #fff;
    }

    /* Header block — centered */
    .th-head { text-align: center; margin-bottom: 1mm; }
    .th-logo { max-width: 35%; max-height: 12mm; margin: 0 auto 1mm; display: block; }
    .th-name {
      font-weight: 800; font-size: 1.15em;
      text-transform: uppercase; letter-spacing: 1px;
      margin-bottom: 0.5mm;
    }
    .th-sub  { margin-top: 0.3mm; }

    /* Dashed rules that read as classic thermal separators */
    .th-hr {
      border: 0;
      border-top: 1px dashed #000;
      margin: 1.5mm 0;
    }

    /* Bill/Date and Customer/Time paired rows */
    .th-meta-row {
      display: flex; justify-content: space-between; gap: 4mm;
      padding: 0.2mm 0;
    }
    .th-meta-row > span:first-child  { text-align: left;  }
    .th-meta-row > span:last-child   { text-align: right; white-space: nowrap; }

    /* --- item grid: Item Description | Qty | Rate | Total --- */
    .th-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .th-table col.c-item { width: 46%; }
    .th-table col.c-qty  { width: 10%; }
    .th-table col.c-rate { width: 20%; }
    .th-table col.c-tot  { width: 24%; }

    .th-table th, .th-table td {
      padding: 0.5mm 0.8mm;
      vertical-align: top;
    }
    .th-table th {
      text-align: left; font-weight: 700;
    }
    .th-table .cell-wrap   { overflow-wrap: anywhere; word-break: break-word; }
    .cell-right            { text-align: right; }
    .cell-nowrap           { white-space: nowrap; }

    /* Totals block — label left, amount right */
    .th-tot-row {
      display: flex; justify-content: space-between; gap: 4mm;
      padding: 0.2mm 0.8mm;
    }
    .th-tot-row > span:last-child { text-align: right; }

    .th-grand {
      font-weight: 800;
      text-transform: uppercase;
      font-size: 1.05em;
      padding: 1mm 0.8mm;
    }

    .th-info-row {
      padding: 0.2mm 0.8mm;
    }

    /* Multi-line centered footer */
    .th-foot        { text-align: center; margin-top: 1mm; }
    .th-foot-line   { margin-top: 0.3mm; }
    .th-foot-line:first-child { font-weight: 700; }

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

  /** True when shop & customer share a state code — CGST + SGST split. */
  isIntraState(): boolean {
    return this.gstLabel === 'GST';
  }

  /** "5208 (5% GST), 6205 (12% GST)" — unique HSN codes across items. */
  hsnSummary(): string {
    const inv = this.invoice();
    if (!inv?.items) return '';
    const map = new Map<string, number>();
    for (const it of inv.items) {
      if (it.hsn) map.set(it.hsn, +it.gst || 0);
    }
    if (map.size === 0) return '';
    return [...map.entries()]
      .map(([hsn, gst]) => `${hsn} (${gst}% GST)`)
      .join(', ');
  }

  /** Multi-line footer from Settings; \n splits into centered lines. */
  footerLines(): string[] {
    const raw = this.shop()?.footer_text
      || 'Thank You! Visit Again.\nGoods once sold cannot be exchanged or returned.';
    return raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
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
