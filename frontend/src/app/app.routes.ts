import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'products', loadComponent: () => import('./products/products.component').then(m => m.ProductsComponent) },
  { path: 'customers', loadComponent: () => import('./customers/customers.component').then(m => m.CustomersComponent) },
  { path: 'invoices', loadComponent: () => import('./invoices/invoices.component').then(m => m.InvoicesComponent) },
  { path: 'invoices/new', loadComponent: () => import('./invoices/invoice-create.component').then(m => m.InvoiceCreateComponent) },
  { path: 'invoices/:id', loadComponent: () => import('./invoices/invoice-view.component').then(m => m.InvoiceViewComponent) },
  { path: '**', redirectTo: '' },
];
