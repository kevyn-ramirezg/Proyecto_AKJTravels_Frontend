import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient /* <-- añade esto */, withInterceptors } from '@angular/common/http'; // <-- y este import

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient() // <-- habilita HttpClient (mínimo requerido)
    // Si luego usas interceptores (p.ej., JWT), usa:
    // provideHttpClient(withInterceptors([authInterceptor])),
  ]
};
