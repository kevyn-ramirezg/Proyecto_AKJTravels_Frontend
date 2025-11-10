import {Component, computed, inject, signal} from '@angular/core';
import {Router, RouterLink, RouterModule} from '@angular/router';
import {TokenService} from '../../services/token-service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
  protected readonly title = signal('AKJTravels');

  constructor(

    private token: TokenService,
    private router: Router
  ) {}


  // ---- Métodos usados por tu HTML ----
  isLogged(): boolean {
    return this.token.isLogged();
  }

  role(): string {
    // Tu TokenService ya normaliza a HOST | GUEST
    return this.token.getRole();
  }

  email(): string {
    // Usa email si viene en el JWT; si no, intenta username/sub
    return this.token.getUsername() || this.token.getUsername?.() || '';
  }

  logout(): void {
    this.token.logout();
    this.router.navigateByUrl('/').then(() => window.location.reload());
  }
}

