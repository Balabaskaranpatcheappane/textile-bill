import { Routes } from '@angular/router';

import { authGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '',           loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'products',   loadComponent: () => import('./products/products.component').then(m => m.ProductsComponent) },
      { path: 'products/:id/barcode', loadComponent: () => import('./products/barcode.component').then(m => m.BarcodeComponent) },
      { path: 'customers',  loadComponent: () => import('./customers/customers.component').then(m => m.CustomersComponent) },
      { path: 'invoices',   loadComponent: () => import('./invoices/invoices.component').then(m => m.InvoicesComponent) },
      { path: 'invoices/new', loadComponent: () => import('./invoices/invoice-create.component').then(m => m.InvoiceCreateComponent) },
      { path: 'invoices/:id', loadComponent: () => import('./invoices/invoice-view.component').then(m => m.InvoiceViewComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
