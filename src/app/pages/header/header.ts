import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { TokenService } from '../../services/token-service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css'] // <- corregido: 'styleUrls' (plural)
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
    // Tu TokenService ya normaliza a HOST | GUEST (o similar)
    return this.token.getRole();
  }

  email(): string {
    // Usa username del JWT
    return this.token.getUsername() || '';
  }

  logout(): void {
    this.token.logout();
    this.router.navigateByUrl('/').then(() => window.location.reload());
  }
}
