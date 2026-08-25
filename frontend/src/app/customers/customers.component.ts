import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api.service';
import { Customer } from '../models';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="header-bar">
      <h2 style="margin:0">Customers</h2>
      <button (click)="startNew()">+ Add customer</button>
    </div>

    <div class="panel" style="margin-bottom:12px">
      <input placeholder="Search by name, phone or GSTIN…"
             [(ngModel)]="query" (ngModelChange)="reload()">
    </div>

    <div class="panel" *ngIf="editing() as c" style="margin-bottom:12px">
      <h3 style="margin-top:0">{{ c.id ? 'Edit customer' : 'New customer' }}</h3>
      <div class="grid-2">
        <div><label>Name</label><input [(ngModel)]="c.name"></div>
        <div><label>Phone</label><input [(ngModel)]="c.phone"></div>
        <div><label>GSTIN</label><input [(ngModel)]="c.gstin"></div>
        <div><label>Address</label><input [(ngModel)]="c.address"></div>
      </div>
      <div style="margin-top:12px; display:flex; gap:8px">
        <button (click)="save()" [disabled]="!c.name">Save</button>
        <button class="secondary" (click)="editing.set(null)">Cancel</button>
      </div>
    </div>

    <div class="panel">
      <table class="table">
        <thead>
          <tr><th>Name</th><th>Phone</th><th>GSTIN</th><th>Address</th><th></th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let c of customers()">
            <td>{{ c.name }}</td>
            <td>{{ c.phone || '—' }}</td>
            <td>{{ c.gstin || '—' }}</td>
            <td>{{ c.address || '—' }}</td>
            <td class="right">
              <button class="secondary" (click)="edit(c)">Edit</button>
              <button class="danger" style="margin-left:6px" (click)="remove(c)">Delete</button>
            </td>
          </tr>
          <tr *ngIf="customers().length === 0">
            <td colspan="5" style="text-align:center; color:var(--muted); padding:20px">
              No customers yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
export class CustomersComponent implements OnInit {
  private api = inject(ApiService);
  customers = signal<Customer[]>([]);
  editing = signal<Partial<Customer> | null>(null);
  query = '';

  ngOnInit() { this.reload(); }

  reload() {
    this.api.listCustomers(this.query).subscribe((r) => this.customers.set(r));
  }

  startNew() { this.editing.set({ name: '', phone: '', gstin: '', address: '' }); }
  edit(c: Customer) { this.editing.set({ ...c }); }

  save() {
    const c = this.editing();
    if (!c || !c.name) return;
    const req = c.id ? this.api.updateCustomer(c.id, c) : this.api.createCustomer(c);
    req.subscribe(() => { this.editing.set(null); this.reload(); });
  }

  remove(c: Customer) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    this.api.deleteCustomer(c.id).subscribe(() => this.reload());
  }
}
