import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api.service';
import { Product } from '../models';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  template: `
    <div class="header-bar">
      <h2 style="margin:0">Products</h2>
      <button (click)="startNew()">+ Add product</button>
    </div>

    <div class="panel" style="margin-bottom:12px">
      <input placeholder="Search by name or HSN…" [(ngModel)]="query" (ngModelChange)="reload()">
    </div>

    <div class="panel" *ngIf="editing() as p" style="margin-bottom:12px">
      <h3 style="margin-top:0">{{ p.id ? 'Edit product' : 'New product' }}</h3>
      <div class="grid-3">
        <div><label>Name</label><input [(ngModel)]="p.name"></div>
        <div><label>HSN</label><input [(ngModel)]="p.hsn"></div>
        <div><label>Unit</label>
          <select [(ngModel)]="p.unit">
            <option>PCS</option><option>MTR</option><option>KG</option><option>SET</option>
          </select>
        </div>
        <div><label>Price (₹)</label><input type="number" min="0" [(ngModel)]="p.price"></div>
        <div><label>Stock</label><input type="number" min="0" [(ngModel)]="p.stock"></div>
        <div><label>GST %</label>
          <select [(ngModel)]="p.gst">
            <option [ngValue]="0">0</option>
            <option [ngValue]="5">5</option>
            <option [ngValue]="12">12</option>
            <option [ngValue]="18">18</option>
            <option [ngValue]="28">28</option>
          </select>
        </div>
      </div>
      <div style="margin-top:12px; display:flex; gap:8px">
        <button (click)="save()" [disabled]="!p.name">Save</button>
        <button class="secondary" (click)="editing.set(null)">Cancel</button>
      </div>
    </div>

    <div class="panel">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th><th>HSN</th><th>Unit</th>
            <th class="right">Price</th><th class="right">Stock</th>
            <th class="right">GST%</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of products()">
            <td>{{ p.name }}</td>
            <td>{{ p.hsn || '—' }}</td>
            <td>{{ p.unit }}</td>
            <td class="right">{{ p.price | currency:'INR':'symbol':'1.2-2' }}</td>
            <td class="right">
              <span class="tag" [class.warn]="p.stock <= 5">{{ p.stock }}</span>
            </td>
            <td class="right">{{ p.gst }}%</td>
            <td class="right">
              <button class="secondary" (click)="edit(p)">Edit</button>
              <button class="danger" style="margin-left:6px" (click)="remove(p)">Delete</button>
            </td>
          </tr>
          <tr *ngIf="products().length === 0">
            <td colspan="7" style="text-align:center; color:var(--muted); padding:20px">
              No products yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
export class ProductsComponent implements OnInit {
  private api = inject(ApiService);
  products = signal<Product[]>([]);
  editing = signal<Partial<Product> | null>(null);
  query = '';

  ngOnInit() { this.reload(); }

  reload() {
    this.api.listProducts(this.query).subscribe((r) => this.products.set(r));
  }

  startNew() {
    this.editing.set({ name: '', hsn: '', unit: 'MTR', price: 0, stock: 0, gst: 5 });
  }
  edit(p: Product) { this.editing.set({ ...p }); }

  save() {
    const p = this.editing();
    if (!p || !p.name) return;
    const req = p.id
      ? this.api.updateProduct(p.id, p)
      : this.api.createProduct(p);
    req.subscribe(() => { this.editing.set(null); this.reload(); });
  }

  remove(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    this.api.deleteProduct(p.id).subscribe(() => this.reload());
  }
}
