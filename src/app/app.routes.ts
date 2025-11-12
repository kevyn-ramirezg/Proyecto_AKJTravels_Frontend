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
import { authGuard } from './guards/auth-guard';
import { ForgotPassword } from './pages/forgot-password/forgot-password';

// ⬇️ Nuevo: componente de edición de perfil (standalone)
import { EditProfile } from './pages/edit-profile/edit-profile';

export const routes: Routes = [
  { path: '', component: Home },

  // Auth públicas (con guard que evita entrar si ya estás logueado)
  { path: 'login', component: Login, canActivate: [loginGuard] },
  { path: 'register', component: Register, canActivate: [loginGuard] },

  // Perfil del usuario (PROTEGIDO)
  { path: 'mi-perfil', component: EditProfile, canActivate: [authGuard] },

  // Zonas de HOST (PROTEGIDAS por rol)
  { path: 'my-places', component: MyPlaces, canActivate: [authGuard, roleGuard], data: { expectedRole: ['HOST', 'ROLE_HOST'] } },
  { path: 'create-place', component: CreatePlace, canActivate: [authGuard, roleGuard], data: { expectedRole: ['HOST', 'ROLE_HOST'] } },
  { path: 'host-dashboard', component: HostDashboard, canActivate: [authGuard, roleGuard], data: { expectedRole: ['HOST', 'ROLE_HOST'] } },

  // Público
  { path: 'place/:id', component: DetailPlace },

  // Grupo /auth (público)
  {
    path: 'auth',
    children: [
      { path: 'forgot-password', component: ForgotPassword, canActivate: [loginGuard] },
    ]
  },

  { path: '**', pathMatch: 'full', redirectTo: '' },
];
