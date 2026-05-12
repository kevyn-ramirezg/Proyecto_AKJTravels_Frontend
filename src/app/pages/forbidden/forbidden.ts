import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="forbidden-container">
      <div class="forbidden-card">
        <div class="icon">🚫</div>
        <h1>Acceso Denegado</h1>
        <p>No tienes permiso para acceder a este recurso.</p>
        <p class="details">
          Si crees que esto es un error, por favor contacta al administrador.
        </p>
        <div class="actions">
          <button (click)="goHome()" class="btn btn-primary">Volver a inicio</button>
          <button (click)="goBack()" class="btn btn-secondary">Atrás</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .forbidden-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #d99ec4 0%, #5d7eff 100%);
      padding: 20px;
      font-family: 'Open Sans', sans-serif;
    }

    .forbidden-card {
      background: white;
      border-radius: 16px;
      padding: 60px 40px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }

    .icon {
      font-size: 80px;
      margin-bottom: 20px;
      display: block;
    }

    h1 {
      color: #222;
      font-size: 32px;
      font-weight: 800;
      margin: 0 0 16px 0;
    }

    p {
      color: #666;
      font-size: 16px;
      margin: 12px 0;
      line-height: 1.6;
    }

    .details {
      color: #999;
      font-size: 14px;
      margin-top: 20px;
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: 40px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      padding: 12px 28px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #004aad, #cb6ce6);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 74, 173, 0.3);
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #222;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    @media (max-width: 600px) {
      .forbidden-card {
        padding: 40px 24px;
      }

      h1 {
        font-size: 24px;
      }

      .icon {
        font-size: 60px;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class ForbiddenComponent {
  private router = inject(Router);

  goHome(): void {
    this.router.navigate(['/']);
  }

  goBack(): void {
    window.history.back();
  }
}
