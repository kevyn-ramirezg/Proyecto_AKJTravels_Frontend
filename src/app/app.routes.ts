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
import { EditProfile } from './pages/edit-profile/edit-profile';
import { EditPlace } from './pages/edit-place/edit-place';
import { SearchResultsComponent } from './pages/search-results/search-results';

export const routes: Routes = [
  { path: '', component: Home },

  // Auth públicass
  { path: 'login', component: Login, canActivate: [loginGuard] },
  { path: 'register', component: Register, canActivate: [loginGuard] },

  // Perfil
  { path: 'mi-perfil', component: EditProfile, canActivate: [authGuard] },

  // Host
  { path: 'my-places', component: MyPlaces, canActivate: [authGuard, roleGuard], data: { expectedRole: ['HOST', 'ROLE_HOST'] } },
  { path: 'create-place', component: CreatePlace, canActivate: [authGuard, roleGuard], data: { expectedRole: ['HOST', 'ROLE_HOST'] } },
  { path: 'host-dashboard', component: HostDashboard, canActivate: [authGuard, roleGuard], data: { expectedRole: ['HOST', 'ROLE_HOST'] } },
  { path: 'edit-place/:id', component: EditPlace, canActivate: [authGuard] },

  // Público
  { path: 'place/:id', component: DetailPlace },

  // Resultados de búsqueda
  { path: 'search', component: SearchResultsComponent },

  // Grupo /auth
  {
    path: 'auth',
    children: [
      { path: 'forgot-password', component: ForgotPassword, canActivate: [loginGuard] },
    ]
  },

  // Wildcard SIEMPRE al final
  { path: '**', pathMatch: 'full', redirectTo: '' },
];
