import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'booking/new', loadComponent: () => import('./features/booking/booking-new/booking-new.component').then(m => m.BookingNewComponent) },
      { path: 'booking/confirm', loadComponent: () => import('./features/booking/booking-confirm/booking-confirm.component').then(m => m.BookingConfirmComponent) },
      { path: 'booking/result', loadComponent: () => import('./features/booking/booking-result/booking-result.component').then(m => m.BookingResultComponent) },
      { path: 'payment', loadComponent: () => import('./features/payment/payment.component').then(m => m.PaymentComponent) },
      { path: 'customers', loadComponent: () => import('./features/customers/customers.component').then(m => m.CustomersComponent) },
      { path: 'pricing', loadComponent: () => import('./features/pricing/pricing.component').then(m => m.PricingComponent), canActivate: [adminGuard] },
      { path: 'courts', loadComponent: () => import('./features/courts/courts.component').then(m => m.CourtsComponent), canActivate: [adminGuard] },
      { path: 'services', loadComponent: () => import('./features/services/services.component').then(m => m.ServicesComponent), canActivate: [adminGuard] },
      { path: 'promotions', loadComponent: () => import('./features/promotions/promotions.component').then(m => m.PromotionsComponent), canActivate: [adminGuard] },
      { path: 'audit', loadComponent: () => import('./features/audit/audit.component').then(m => m.AuditComponent), canActivate: [adminGuard] },
      { path: 'reports', loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent), canActivate: [adminGuard] },
      { path: 'staff', loadComponent: () => import('./features/staff/staff.component').then(m => m.StaffComponent), canActivate: [adminGuard] },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
