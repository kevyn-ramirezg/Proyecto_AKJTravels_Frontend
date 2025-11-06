import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { CreatePlace } from './pages/create-place/create-place';
import {MyPlaces} from './pages/my-places/my-places';
import {DetailPlace} from './pages/detail-place/detail-place';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: "my-places", component: MyPlaces },
  { path: 'create-place', component: CreatePlace },
  { path: 'place/:id', component: DetailPlace },
  { path: "**", pathMatch: "full", redirectTo: "" },


];
