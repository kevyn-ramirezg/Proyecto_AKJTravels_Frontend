import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { CreatePlace } from './pages/create-place/create-place';


import { HostDashboard } from './pages/host-dashboard/host-dashboard';
import { loginGuard } from './guards/login-guard';
import { roleGuard } from './guards/role-guard';
import { authGuard } from './guards/auth-guard';
import { ForgotPassword } from './pages/forgot-password/forgot-password';


// ⬇️ Nuevo: componente de edición de perfil (standalone)
import { EditProfile } from './pages/edit-profile/edit-profile';
import {EditPlace} from './pages/edit-place/edit-place';
import DetailPlaceComponent from './pages/detail-place/detail-place';
import { SearchResultsComponent } from './pages/search-results/search-results';
import {CreateBooking} from './pages/create-booking/create-booking';
import { MyReservations } from './pages/my-reservations/my-reservations';
import {MyFavorites} from './pages/my-favorites/my-favorites';

export const routes: Routes = [
  { path: '', component: Home },

  { path: 'login', component: Login, canActivate: [loginGuard] },
  { path: 'register', component: Register, canActivate: [loginGuard] },

  { path: 'mi-perfil', component: EditProfile, canActivate: [authGuard] },

  { path: 'create-place', component: CreatePlace, canActivate: [authGuard, roleGuard], data: { expectedRole: ['HOST', 'ROLE_HOST'] } },
  { path: 'host-dashboard', component: HostDashboard, canActivate: [authGuard, roleGuard], data: { expectedRole: ['HOST', 'ROLE_HOST'] } },

  { path: 'search', component: SearchResultsComponent },
  { path: 'edit-place/:id', component: EditPlace, canActivate: [authGuard] },

  { path: 'place/:id', component: DetailPlaceComponent },
  {path: 'my-favorites', component: MyFavorites},
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
  {
    path: 'my-reservations',
    component: MyReservations,
    canActivate: [authGuard, roleGuard],
    data: { expectedRole: ['USER'] }
  },
  // 🚨 SIEMPRE DE ÚLTIMO
  { path: '**', pathMatch: 'full', redirectTo: '' },

];

