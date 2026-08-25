import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiService } from '../services/api.service';
import { AutocompleteComponent } from '../shared/autocomplete.component';
import { Customer, Invoice, InvoiceItem, Product } from '../models';

interface Line extends InvoiceItem {
  product_id: number | null;
}

@Component({
  selector: 'app-invoice-create',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, AutocompleteComponent],
  template: `
    <div class="header-bar">
      <h2 style="margin:0">New Invoice</h2>
    </div>

    <div class="panel" style="margin-bottom:12px">
      <label>📷 Scan barcode</label>
      <input #scanner [(ngModel)]="scanCode"
             placeholder="Focus here and scan (or type + Enter)"
             (keydown.enter)="onScan(); $event.preventDefault()"
             autofocus>
      <div *ngIf="scanMsg()" class="scan-msg" [class.err]="scanErr()">
        {{ scanMsg() }}
      </div>
    </div>

    <div class="panel" style="margin-bottom:12px">
      <div class="grid-3">
        <div style="grid-column: span 2">
          <label>Customer (type to search — leave blank for walk-in)</label>
          <app-autocomplete
            [items]="customers()"
            [display]="customerDisplay"
            [secondary]="customerSecondary"
            [searchFields]="customerSearchFields"
            [value]="customerName"
            (valueChange)="customerName = $event; onCustomerText($event)"
            (picked)="pickCustomer($event)"
            emptyHint="No match — will be saved as a walk-in on this bill"
            placeholder="Type customer name, phone or GSTIN…">
          </app-autocomplete>
        </div>
        <div><label>Phone</label><input [(ngModel)]="customerPhone"></div>
        <div><label>GSTIN</label><input [(ngModel)]="customerGstin"></div>
        <div style="grid-column: span 2"><label>Address</label><input [(ngModel)]="customerAddress"></div>
        <div><label>Invoice date</label><input type="date" [(ngModel)]="invoiceDate"></div>
        <div>
          <label>Payment mode</label>
          <select [(ngModel)]="paymentMode">
            <option>CASH</option><option>UPI</option><option>CARD</option><option>CREDIT</option>
          </select>
        </div>
        <div><label>Discount (₹)</label><input type="number" min="0" [(ngModel)]="discount"></div>
      </div>
    </div>

    <div class="panel">
      <div class="header-bar">
        <h3 style="margin:0">Line items</h3>
        <button (click)="addLine()">+ Add item</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th style="width:32%">Product</th>
            <th>HSN</th>
            <th class="right">Qty</th>
            <th class="right">Price</th>
            <th class="right">GST%</th>
            <th class="right">Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let l of lines(); let i = index">
            <td>
              <app-autocomplete
                [items]="products()"
                [display]="productDisplay"
                [secondary]="productSecondary"
                [searchFields]="productSearchFields"
                [value]="l.name"
                (valueChange)="onLineNameText(i, $event)"
                (picked)="pickProduct(i, $event)"
                emptyHint="No match — will be saved as a custom item"
                placeholder="Type product name, HSN or barcode…">
              </app-autocomplete>
            </td>
            <td><input [(ngModel)]="l.hsn"></td>
            <td class="right"><input type="number" min="0" step="0.01" [(ngModel)]="l.qty" style="text-align:right"></td>
            <td class="right"><input type="number" min="0" step="0.01" [(ngModel)]="l.price" style="text-align:right"></td>
            <td class="right">
              <select [(ngModel)]="l.gst">
                <option [ngValue]="0">0</option>
                <option [ngValue]="5">5</option>
                <option [ngValue]="12">12</option>
                <option [ngValue]="18">18</option>
                <option [ngValue]="28">28</option>
              </select>
            </td>
            <td class="right">{{ lineTotal(l) | currency:'INR':'symbol':'1.2-2' }}</td>
            <td class="right">
              <button class="danger" (click)="removeLine(i)">✕</button>
            </td>
          </tr>
          <tr *ngIf="lines().length === 0">
            <td colspan="7" style="text-align:center; color:var(--muted); padding:16px">
              No items yet.
            </td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex; justify-content:flex-end; margin-top:16px">
        <table style="min-width:280px">
          <tr><td style="color:var(--muted)">Sub-total</td>
              <td class="right">{{ subtotal() | currency:'INR':'symbol':'1.2-2' }}</td></tr>
          <tr><td style="color:var(--muted)">GST (CGST+SGST)</td>
              <td class="right">{{ gstTotal() | currency:'INR':'symbol':'1.2-2' }}</td></tr>
          <tr><td style="color:var(--muted)">Discount</td>
              <td class="right">− {{ discount | currency:'INR':'symbol':'1.2-2' }}</td></tr>
          <tr style="font-weight:700; font-size:16px">
            <td>Total</td>
            <td class="right">{{ grandTotal() | currency:'INR':'symbol':'1.2-2' }}</td>
          </tr>
        </table>
      </div>

      <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:16px">
        <button class="secondary" (click)="reset()">Clear</button>
        <button (click)="save()" [disabled]="!canSave()">Save invoice</button>
      </div>
    </div>
  `,
  styles: [`
    .scan-msg { margin-top: 8px; font-size: 12px; color: var(--success); }
    .scan-msg.err { color: var(--danger); }
  `],
})
export class InvoiceCreateComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  products = signal<Product[]>([]);
  customers = signal<Customer[]>([]);
  lines = signal<Line[]>([]);

  scanCode = '';
  scanMsg = signal<string | null>(null);
  scanErr = signal(false);

  customerId: number | null = null;
  customerName = '';
  customerPhone = '';
  customerGstin = '';
  customerAddress = '';
  invoiceDate = new Date().toISOString().slice(0, 10);
  paymentMode = 'CASH';
  discount = 0;

  subtotal = computed(() =>
    this.lines().reduce((s, l) => s + (+l.qty || 0) * (+l.price || 0), 0));
  gstTotal = computed(() =>
    this.lines().reduce((s, l) => s + ((+l.qty || 0) * (+l.price || 0) * (+l.gst || 0)) / 100, 0));
  grandTotal = computed(() =>
    Math.max(0, this.subtotal() + this.gstTotal() - (+this.discount || 0)));

  ngOnInit() {
    this.api.listProducts().subscribe((r) => this.products.set(r));
    this.api.listCustomers().subscribe((r) => this.customers.set(r));
    this.addLine();
  }

  lineTotal(l: Line) {
    const base = (+l.qty || 0) * (+l.price || 0);
    return base + (base * (+l.gst || 0)) / 100;
  }

  onScan() {
    const code = this.scanCode.trim();
    if (!code) return;
    this.api.findProductByBarcode(code).subscribe({
      next: (p) => {
        // If this product is already on the invoice, bump its qty; else add a line.
        const idx = this.lines().findIndex((l) => l.product_id === p.id);
        if (idx >= 0) {
          this.lines.update((ls) => {
            const copy = [...ls];
            copy[idx] = { ...copy[idx]!, qty: (+copy[idx]!.qty || 0) + 1 };
            return copy;
          });
        } else {
          // Drop the first empty auto-added line, if any, so the invoice
          // doesn't start with a blank row after the first scan.
          this.lines.update((ls) => {
            const trimmed = ls.filter((l) => !(l.product_id === null && !l.name && l.price === 0));
            return [...trimmed, {
              product_id: p.id, name: p.name, hsn: p.hsn ?? '', unit: p.unit,
              qty: 1, price: p.price, gst: p.gst,
            }];
          });
        }
        this.scanErr.set(false);
        this.scanMsg.set(`Added: ${p.name}`);
        this.scanCode = '';
      },
      error: () => {
        this.scanErr.set(true);
        this.scanMsg.set(`No product with barcode "${code}"`);
      },
    });
  }

  addLine() {
    this.lines.update((ls) => [
      ...ls,
      { product_id: null, name: '', hsn: '', unit: 'PCS', qty: 1, price: 0, gst: 5 },
    ]);
  }

  removeLine(i: number) {
    this.lines.update((ls) => ls.filter((_, idx) => idx !== i));
  }

  // ----- Product typeahead -----
  productDisplay      = (p: Product) => p.name;
  productSecondary    = (p: Product) =>
    `₹${p.price} · ${p.stock} ${p.unit} in stock`
    + (p.barcode ? ` · ${p.barcode}` : '')
    + (p.hsn ? ` · HSN ${p.hsn}` : '');
  productSearchFields = ['name', 'hsn', 'barcode'];

  pickProduct(i: number, p: Product) {
    this.lines.update((ls) => {
      const copy = [...ls];
      copy[i] = {
        ...copy[i]!,
        product_id: p.id,
        name: p.name,
        hsn: p.hsn ?? '',
        unit: p.unit,
        price: p.price,
        gst: p.gst,
      };
      return copy;
    });
  }

  /** Free typing in the line-item picker: keep the typed name, but if
   *  it no longer matches the picked product's name, drop the link. */
  onLineNameText(i: number, text: string) {
    this.lines.update((ls) => {
      const copy = [...ls];
      const cur = copy[i]!;
      const linked = this.products().find((p) => p.id === cur.product_id);
      const clearedLink = linked && linked.name !== text;
      copy[i] = { ...cur, name: text, product_id: clearedLink ? null : cur.product_id };
      return copy;
    });
  }

  // ----- Customer typeahead -----
  customerDisplay      = (c: Customer) => c.name;
  customerSecondary    = (c: Customer) =>
    [c.phone, c.gstin].filter(Boolean).join(' · ');
  customerSearchFields = ['name', 'phone', 'gstin'];

  pickCustomer(c: Customer) {
    this.customerId      = c.id;
    this.customerName    = c.name;
    this.customerPhone   = c.phone ?? '';
    this.customerGstin   = c.gstin ?? '';
    this.customerAddress = c.address ?? '';
  }

  /** If the user edits the name after picking, treat this as a new
   *  walk-in and clear the linked customer id. */
  onCustomerText(text: string) {
    if (this.customerId != null) {
      const linked = this.customers().find((c) => c.id === this.customerId);
      if (!linked || linked.name !== text) this.customerId = null;
    }
  }

  canSave() {
    return this.customerName.trim().length > 0 && this.lines().some((l) => l.qty > 0 && l.price > 0 && (l.name || '').trim().length > 0);
  }

  reset() {
    this.customerId = null;
    this.customerName = ''; this.customerPhone = '';
    this.customerGstin = ''; this.customerAddress = '';
    this.discount = 0;
    this.lines.set([]);
    this.addLine();
  }

  save() {
    const payload: Partial<Invoice> = {
      customer_id: this.customerId,
      customer_name: this.customerName,
      customer_phone: this.customerPhone,
      customer_gstin: this.customerGstin,
      customer_address: this.customerAddress,
      invoice_date: this.invoiceDate,
      payment_mode: this.paymentMode,
      discount: +this.discount || 0,
      items: this.lines().filter((l) => l.qty > 0 && l.price > 0 && (l.name || '').trim().length > 0),
    };
    this.api.createInvoice(payload).subscribe((inv) => {
      this.router.navigate(['/invoices', inv.id]);
    });
  }
}
