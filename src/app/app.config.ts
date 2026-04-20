import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { errorInterceptorFixed } from './interceptors/error.interceptor';
import { routes } from './app.routes';
import { API_BASE } from './core/api-base-token';
import { environment } from '../environments/environment.prod';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorInterceptorFixed, authInterceptor])),
    { provide: API_BASE, useValue: environment.apiBase },
  ]
};
