import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingService } from './core/loading.service';
import { EMPTY } from 'rxjs';

describe('App', () => {
  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', [
      'navigate',
      'createUrlTree',
      'serializeUrl'
    ], {
      url: '/',
      events: EMPTY
    });

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        LoadingService,
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => null
              }
            }
          }
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render app structure', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    
    // Verificar que app-header existe
    expect(compiled.querySelector('app-header')).toBeTruthy();
    // Verificar que router-outlet existe
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    // Verificar que app-footer existe
    expect(compiled.querySelector('app-footer')).toBeTruthy();
  });
});
