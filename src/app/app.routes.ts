import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { ForbiddenComponent } from './pages/forbidden/forbidden';
import { loginGuard } from './guards/login-guard';
import { roleGuard } from './guards/role-guard';
import { authGuard } from './guards/auth-guard';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import DetailPlaceComponent from './pages/detail-place/detail-place';
import { SearchResultsComponent } from './pages/search-results/search-results';
import { CreateBooking } from './pages/create-booking/create-booking';

export const routes: Routes = [
  { path: '', component: Home },

  { path: 'login', component: Login, canActivate: [loginGuard] },
  { path: 'register', component: Register, canActivate: [loginGuard] },

  // Lazy loaded - Feature routes
  {
    path: 'mi-perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/edit-profile/edit-profile').then(m => m.EditProfile)
  },
  {
    path: 'create-place',
    canActivate: [authGuard, roleGuard],
    data: { expectedRole: ['HOST', 'ROLE_HOST'] },
    loadComponent: () => import('./pages/create-place/create-place').then(m => m.CreatePlace)
  },
  {
    path: 'host-dashboard',
    canActivate: [authGuard, roleGuard],
    data: { expectedRole: ['HOST', 'ROLE_HOST'] },
    loadComponent: () => import('./pages/host-dashboard/host-dashboard').then(m => m.HostDashboard)
  },
  {
    path: 'edit-place/:id',
    canActivate: [authGuard, roleGuard],
    data: { expectedRole: ['HOST', 'ROLE_HOST'] },
    loadComponent: () => import('./pages/edit-place/edit-place').then(m => m.EditPlace)
  },
  {
    path: 'my-favorites',
    canActivate: [authGuard, roleGuard],
    data: { expectedRole: ['USER'] },
    loadComponent: () => import('./pages/my-favorites/my-favorites').then(m => m.MyFavorites)
  },
  {
    path: 'my-reservations',
    canActivate: [authGuard, roleGuard],
    data: { expectedRole: ['USER'] },
    loadComponent: () => import('./pages/my-reservations/my-reservations').then(m => m.MyReservations)
  },

  // Eager loaded - Core routes
  { path: 'search', component: SearchResultsComponent },
  { path: 'place/:id', component: DetailPlaceComponent },
  {
    path: 'auth',
    children: [
      { path: 'forgot-password', component: ForgotPassword, canActivate: [loginGuard] },
    ]
  },
  {
    path: 'create-booking',
    component: CreateBooking,
    canActivate: [authGuard, roleGuard],
    data: { expectedRole: ['USER'] }
  },
  { path: 'forbidden', component: ForbiddenComponent },

  // 🚨 SIEMPRE DE ÚLTIMO
  { path: '**', pathMatch: 'full', redirectTo: '' },

];

