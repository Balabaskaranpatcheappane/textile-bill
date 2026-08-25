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

        <!-- === Thermal (58 / 80 mm) === -->
        <ng-container *ngIf="size !== 'a4'">
          <div class="th-head">
            <img *ngIf="logoUrl()" [src]="logoUrl()!" class="th-logo" alt="">
            <div class="th-name">{{ shop()?.shop_name || 'Textiles Shop' }}</div>
            <div class="th-sub" *ngIf="shop()?.address">{{ shop()?.address }}</div>
            <div class="th-sub" *ngIf="shop()?.phone || shop()?.email">
              <ng-container *ngIf="shop()?.phone">Ph: {{ shop()?.phone }}</ng-container>
              <ng-container *ngIf="shop()?.phone && shop()?.email"> · </ng-container>
              <ng-container *ngIf="shop()?.email">{{ shop()?.email }}</ng-container>
            </div>
            <div class="th-sub" *ngIf="shop()?.gstin">GSTIN: {{ shop()?.gstin }}</div>
          </div>

          <div class="th-hr"></div>

          <div class="th-badge">CASH BILL</div>

          <div class="th-meta">
            <div><span>Bill</span><b>{{ inv.invoice_no }}</b></div>
            <div><span>Date</span><span>{{ inv.invoice_date | date:'dd/MM/yy HH:mm' }}</span></div>
            <div *ngIf="inv.customer_name && inv.customer_name !== 'Walk-in'">
              <span>To</span><span>{{ inv.customer_name }}</span>
            </div>
            <div *ngIf="inv.customer_phone">
              <span>Phone</span><span>{{ inv.customer_phone }}</span>
            </div>
            <div *ngIf="inv.customer_gstin">
              <span>GSTIN</span><span>{{ inv.customer_gstin }}</span>
            </div>
          </div>

          <div class="th-hr"></div>

          <!-- Two-row item layout: name on line 1, qty×rate + amount on line 2 -->
          <div class="th-items">
            <div class="th-item" *ngFor="let it of inv.items; let i = index">
              <div class="th-item-name">{{ i + 1 }}. {{ it.name }}</div>
              <div class="th-item-calc">
                <span class="th-qty">
                  {{ it.qty }} {{ it.unit || '' }} × {{ it.price | number:'1.2-2' }}
                  <span class="th-gst" *ngIf="it.gst"> (GST {{ it.gst }}%)</span>
                </span>
                <span class="th-amt">{{ it.amount | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>

          <div class="th-hr"></div>

          <div class="th-tot"><span>Sub-total</span><b>{{ inv.subtotal | number:'1.2-2' }}</b></div>
          <div class="th-tot"><span>GST</span><b>{{ inv.gst_total | number:'1.2-2' }}</b></div>
          <div class="th-tot" *ngIf="inv.discount">
            <span>Discount</span><b>− {{ inv.discount | number:'1.2-2' }}</b>
          </div>

          <div class="th-grand-box">
            <div class="th-grand-label">GRAND TOTAL</div>
            <div class="th-grand-val">₹ {{ inv.grand_total | number:'1.2-2' }}</div>
          </div>

          <div class="th-pay">
            <div><span>Payment</span><b>{{ inv.payment_mode }}</b></div>
            <div><span>Items</span><b>{{ inv.items?.length }}</b></div>
          </div>

          <div class="th-hr"></div>

          <div class="th-foot">
            <div class="th-thanks">{{ shop()?.footer_text || 'Thank you, visit again!' }}</div>
            <div class="th-tiny">This is a computer-generated bill.</div>
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

    /* ---------- Thermal (both 58 & 80) ---------- */
    .invoice-doc.size-58mm { font-size: 10px;   line-height: 1.3; }
    .invoice-doc.size-80mm { font-size: 11.5px; line-height: 1.35; }
    .invoice-doc.size-58mm, .invoice-doc.size-80mm { color: #000; }

    .th-head   { text-align: center; margin-bottom: 2mm; }
    .th-logo   { max-width: 50%; max-height: 16mm; margin: 0 auto 1.5mm; display: block; }
    .th-name   { font-weight: 800; font-size: 1.4em; letter-spacing: .5px; }
    .th-sub    { font-size: 0.9em; margin-top: 1px; }

    .th-hr     { border-top: 1px dashed #000; margin: 2mm 0; }
    .th-badge  {
      text-align: center; font-weight: 700; letter-spacing: 2px;
      border: 1px solid #000; padding: 1px 0; margin: 1.5mm 0;
      font-size: 0.9em;
    }
    .th-meta   { display: grid; gap: 1px; }
    .th-meta > div { display: flex; justify-content: space-between; gap: 6px; }
    .th-meta > div > :first-child { color: #333; }

    .th-items  { display: flex; flex-direction: column; gap: 1.5mm; }
    .th-item-name { font-weight: 600; }
    .th-item-calc { display: flex; justify-content: space-between;
                    gap: 6px; padding-left: 8px; font-size: 0.95em; }
    .th-gst    { color: #333; }
    .th-amt    { font-variant-numeric: tabular-nums; }

    .th-tot    { display: flex; justify-content: space-between;
                 font-variant-numeric: tabular-nums; }

    .th-grand-box {
      border-top: 2px solid #000; border-bottom: 2px solid #000;
      margin: 2mm 0; padding: 1.5mm 0;
      display: flex; justify-content: space-between; align-items: baseline;
    }
    .th-grand-label { font-weight: 800; font-size: 1.05em; letter-spacing: 1px; }
    .th-grand-val   { font-weight: 800; font-size: 1.3em;
                      font-variant-numeric: tabular-nums; }

    .th-pay { display: grid; gap: 1px; }
    .th-pay > div { display: flex; justify-content: space-between; }

    .th-foot   { text-align: center; margin-top: 2mm; }
    .th-thanks { font-style: italic; font-weight: 600; }
    .th-tiny   { font-size: 0.8em; color: #333; margin-top: 1mm; }

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
