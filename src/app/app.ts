import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationError, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Header } from './pages/header/header';
import { Footer } from './pages/footer/footer';
import { LoadingService } from './core/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit, OnDestroy {
  loadingService = inject(LoadingService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event instanceof NavigationStart) {
          this.loadingService.show();
        }
        if (event instanceof NavigationEnd || event instanceof NavigationError) {
          // Pequeño delay para que la animación sea visible
          setTimeout(() => {
            this.loadingService.hide();
          }, 300);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
