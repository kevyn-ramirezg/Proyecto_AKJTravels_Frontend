import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient /* <-- añade esto */, withInterceptors } from '@angular/common/http'; // <-- y este import
import { authInterceptor } from './interceptors/auth.interceptor'; // <-- y este import si usas interceptores
import { routes } from './app.routes';
import { API_BASE } from './core/api-base-token';
import { environment } from '../environments/environment';
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: API_BASE, useValue: environment.apiBase },
    // <-- habilita HttpClient (mínimo requerido)
    // Si luego usas interceptores (p.ej., JWT), usa:
    // provideHttpClient(withInterceptors([authInterceptor])),
  ]
};
