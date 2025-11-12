import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { CreatePlace } from './pages/create-place/create-place';
import { MyPlaces } from './pages/my-places/my-places';
import { DetailPlace } from './pages/detail-place/detail-place';
import { HostDashboard } from './pages/host-dashboard/host-dashboard';
import { loginGuard } from './guards/login-guard';
import { roleGuard } from './guards/role-guard';
import { hostGuard } from './guards/host.guard';
import { authGuard } from './guards/auth-guard';
import { ForgotPassword } from './pages/forgot-password/forgot-password';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login, canActivate: [loginGuard] },
  { path: 'register', component: Register, canActivate: [loginGuard] },
  { path: 'my-places', component: MyPlaces, canActivate: [authGuard, roleGuard], data: { expectedRole: ['HOST', 'ROLE_HOST'] } },
  { path: 'create-place', component: CreatePlace, canActivate: [authGuard, roleGuard], data: { expectedRole: ['HOST', 'ROLE_HOST'] } },
  { path: 'place/:id', component: DetailPlace },
  { path: 'host-dashboard', component: HostDashboard, canActivate: [authGuard, roleGuard], data: { expectedRole: ['HOST', 'ROLE_HOST'] } },

  // ⬇️ NUEVO: grupo /auth con la ruta forgot-password (SIN guards)
  {
    path: 'auth',
    children: [
      { path: 'forgot-password', component: ForgotPassword, canActivate: [loginGuard] },
    ]
  },

  { path: '**', pathMatch: 'full', redirectTo: '' },
];
