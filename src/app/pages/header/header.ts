import {Component, computed, inject, signal} from '@angular/core';
import {RouterLink, RouterModule} from '@angular/router';
import {TokenService} from '../../services/token-service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {

  private token = inject(TokenService);
  isLogged = computed(() => this.token.isLoggedSig());

  protected readonly title = signal('AKJTravels');
  logout() {
    this.token.logout();
  }
}
