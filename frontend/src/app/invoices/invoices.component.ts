import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { Invoice } from '../models';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe],
  template: `
    <div class="header-bar">
      <h2 style="margin:0">Invoices</h2>
      <a class="btn" routerLink="/invoices/new">+ New Invoice</a>
    </div>

    <div class="panel" style="margin-bottom:12px">
      <input placeholder="Search by invoice no, customer name or phone…"
             [(ngModel)]="query" (ngModelChange)="reload()">
    </div>

    <div class="panel">
      <table class="table">
        <thead>
          <tr>
            <th>Invoice No</th><th>Date</th><th>Customer</th>
            <th>Payment</th><th class="right">Total</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let inv of invoices()">
            <td><a [routerLink]="['/invoices', inv.id]">{{ inv.invoice_no }}</a></td>
            <td>{{ inv.invoice_date | date:'mediumDate' }}</td>
            <td>{{ inv.customer_name }}</td>
            <td><span class="tag">{{ inv.payment_mode }}</span></td>
            <td class="right">{{ inv.grand_total | currency:'INR':'symbol':'1.2-2' }}</td>
            <td class="right">
              <a class="btn secondary" [routerLink]="['/invoices', inv.id]">View</a>
              <button *ngIf="auth.isAdmin()" class="danger" style="margin-left:6px" (click)="remove(inv)">Delete</button>
            </td>
          </tr>
          <tr *ngIf="invoices().length === 0">
            <td colspan="6" style="text-align:center; color:var(--muted); padding:20px">
              No invoices yet — create one from the top-right.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
export class InvoicesComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  invoices = signal<Invoice[]>([]);
  query = '';

  ngOnInit() { this.reload(); }
  reload() { this.api.listInvoices(this.query).subscribe((r) => this.invoices.set(r)); }

  remove(inv: Invoice) {
    if (!confirm(`Delete invoice ${inv.invoice_no}?`)) return;
    this.api.deleteInvoice(inv.id).subscribe(() => this.reload());
  }
}
