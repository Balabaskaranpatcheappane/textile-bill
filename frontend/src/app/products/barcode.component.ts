import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../services/api.service';
import { Product } from '../models';

@Component({
  selector: 'app-barcode',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe],
  template: `
    <div class="header-bar no-print">
      <a class="btn secondary" routerLink="/products">← Back to products</a>
      <div style="display:flex; gap:8px; align-items:center">
        <label style="margin:0">Copies</label>
        <input type="number" min="1" max="100" [(ngModel)]="copies" style="width:80px">
        <button (click)="print()">🖨 Print labels</button>
      </div>
    </div>

    <ng-container *ngIf="product() as p">
      <div class="sheet">
        <div class="label" *ngFor="let _ of range(copies)">
          <div class="name">{{ p.name }}</div>
          <div class="price">{{ p.price | currency:'INR':'symbol':'1.2-2' }} / {{ p.unit }}</div>
          <img class="bc-img" [src]="api.barcodeImageUrl(p.id)" alt="{{ p.barcode }}">
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .sheet {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      max-width: 900px;
      margin: 0 auto;
    }
    .label {
      background: #fff;
      border: 1px dashed var(--panel-border);
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
    }
    .name  { font-weight: 600; font-size: 13px; margin-bottom: 2px; }
    .price { color: var(--muted); font-size: 12px; margin-bottom: 6px; }
    .bc-img { max-width: 100%; height: auto; image-rendering: crisp-edges; }

    @media print {
      .sheet { gap: 6px; max-width: none; }
      .label { border: none; padding: 4px; page-break-inside: avoid; }
    }
  `],
})
export class BarcodeComponent implements OnInit {
  api = inject(ApiService);
  @Input() id!: string;
  product = signal<Product | null>(null);
  copies = 6;

  ngOnInit() {
    this.api.listProducts().subscribe((rows) => {
      const p = rows.find((r) => r.id === +this.id);
      if (p) this.product.set(p);
    });
  }

  range(n: number) { return new Array(Math.max(1, Math.min(100, +n || 1))); }
  print() { window.print(); }
}
