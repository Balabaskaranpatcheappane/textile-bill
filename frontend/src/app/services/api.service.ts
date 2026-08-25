import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Customer, DashboardSummary, DashboardTrend, Invoice, Product,
  ReportPeriod, SalesReport,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  // Products
  listProducts(q?: string): Observable<Product[]> {
    const params = q ? new HttpParams().set('q', q) : undefined;
    return this.http.get<Product[]>(`${this.base}/products`, { params });
  }
  createProduct(p: Partial<Product>) { return this.http.post<Product>(`${this.base}/products`, p); }
  updateProduct(id: number, p: Partial<Product>) { return this.http.put<Product>(`${this.base}/products/${id}`, p); }
  deleteProduct(id: number) { return this.http.delete<void>(`${this.base}/products/${id}`); }
  findProductByBarcode(code: string) {
    return this.http.get<Product>(`${this.base}/products/barcode/${encodeURIComponent(code)}`);
  }
  barcodeImageUrl(id: number) { return `${this.base}/products/${id}/barcode.png`; }

  // Customers
  listCustomers(q?: string): Observable<Customer[]> {
    const params = q ? new HttpParams().set('q', q) : undefined;
    return this.http.get<Customer[]>(`${this.base}/customers`, { params });
  }
  createCustomer(c: Partial<Customer>) { return this.http.post<Customer>(`${this.base}/customers`, c); }
  updateCustomer(id: number, c: Partial<Customer>) { return this.http.put<Customer>(`${this.base}/customers/${id}`, c); }
  deleteCustomer(id: number) { return this.http.delete<void>(`${this.base}/customers/${id}`); }

  // Invoices
  listInvoices(q?: string) {
    const params = q ? new HttpParams().set('q', q) : undefined;
    return this.http.get<Invoice[]>(`${this.base}/invoices`, { params });
  }
  getInvoice(id: number) { return this.http.get<Invoice>(`${this.base}/invoices/${id}`); }
  createInvoice(inv: Partial<Invoice>) { return this.http.post<Invoice>(`${this.base}/invoices`, inv); }
  deleteInvoice(id: number) { return this.http.delete<void>(`${this.base}/invoices/${id}`); }
  dashboard() { return this.http.get<DashboardSummary>(`${this.base}/invoices/summary/today`); }

  // Reports
  salesReport(period: ReportPeriod, from?: string, to?: string) {
    let params = new HttpParams().set('period', period);
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<SalesReport>(`${this.base}/reports/sales`, { params });
  }
  dashboardTrend() {
    return this.http.get<DashboardTrend>(`${this.base}/reports/dashboard-trend`);
  }
}
