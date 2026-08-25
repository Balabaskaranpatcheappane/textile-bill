import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ApiService } from '../services/api.service';
import { Invoice } from '../models';

@Component({
  selector: 'app-invoice-view',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe],
  template: `
    <div class="header-bar no-print">
      <a class="btn secondary" routerLink="/invoices">← Back</a>
      <button (click)="print()">🖨 Print</button>
    </div>

    <ng-container *ngIf="invoice() as inv">
      <div class="panel invoice-doc">
        <header class="doc-head">
          <div>
            <div class="shop-name">🧵 Textiles Shop</div>
            <div class="shop-addr">
              123, Main Bazaar Road, City<br>
              GSTIN: 33ABCDE1234F1Z5 · +91 90000 00000
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
          <div>
            <div class="section-label">Bill to</div>
            <div class="c-name">{{ inv.customer_name }}</div>
            <div *ngIf="inv.customer_phone">Phone: {{ inv.customer_phone }}</div>
            <div *ngIf="inv.customer_gstin">GSTIN: {{ inv.customer_gstin }}</div>
            <div *ngIf="inv.customer_address">{{ inv.customer_address }}</div>
          </div>
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
          <p>Thank you for your purchase!</p>
        </footer>
      </div>
    </ng-container>
  `,
  styles: [`
    .invoice-doc { max-width: 820px; margin: 0 auto; }
    .doc-head {
      display:flex; justify-content:space-between; align-items:flex-start;
      border-bottom:2px solid #111827; padding-bottom:12px; margin-bottom:16px;
    }
    .shop-name { font-size:20px; font-weight:700; }
    .shop-addr { color:var(--muted); font-size:12px; margin-top:2px; }
    .doc-title { font-size:22px; font-weight:800; letter-spacing:.05em; color:var(--primary); }
    .bill-to { margin-bottom:12px; }
    .section-label { font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); }
    .c-name { font-weight:600; font-size:16px; margin-top:2px; }
    .totals { display:flex; justify-content:flex-end; margin-top:16px; }
    .totals table { min-width:280px; }
    .totals td { padding:4px 8px; }
    .totals tr.grand { font-weight:700; font-size:16px; border-top:1px solid var(--panel-border); }
    .doc-foot { margin-top:24px; color:var(--muted); font-size:12px; }
  `],
})
export class InvoiceViewComponent implements OnInit {
  private api = inject(ApiService);
  @Input() id!: string;
  invoice = signal<Invoice | null>(null);

  ngOnInit() {
    this.api.getInvoice(+this.id).subscribe((inv) => this.invoice.set(inv));
  }

  print() { window.print(); }
}
