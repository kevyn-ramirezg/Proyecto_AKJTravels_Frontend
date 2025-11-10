import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormControl,
  FormGroup
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {TokenService} from '../../services/token-service';
import {AuthRegisterService} from '../../services/auth-service';
import Swal from 'sweetalert2';
import {LoginDTO} from '../../model/login-dto';

type LoginForm = FormGroup<{
  email: FormControl<string>;
  password: FormControl<string>;
}>;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  loginForm: LoginForm;
  loading = false;
  error: string | null = null;

  constructor(private fb: FormBuilder, private router: Router,  private authService: AuthRegisterService, private tokenService: TokenService) {
    this.loginForm = this.fb.nonNullable.group({
      email: this.fb.nonNullable.control('', {
        validators: [Validators.required, Validators.email]
      }),
      password: this.fb.nonNullable.control('', {
        validators: [Validators.required]
      })
    });
  }

  get f() {
    return this.loginForm.controls;
  }


  public login() {
    const loginDTO = this.loginForm.value as LoginDTO;

    this.authService.login(loginDTO).subscribe({
      next: ({ message }) => {
        // guarda el token
        this.tokenService.login(message.token);

        // lee el rol del payload (HOST | GUEST)
        const role = this.tokenService.getRole();

        // si venías con ?returnUrl=... respeta eso (opcional)
        const urlTree = this.router.parseUrl(this.router.url);
        const returnUrl = urlTree.queryParams['returnUrl'];

        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
          return;
        }

        // redirección por rol
        if (role === 'HOST') {
          this.router.navigate(['/host-dashboard']);
        } else {
          this.router.navigate(['/']); // huésped → home (mostrará el menú por estar logueado)
        }
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'No se pudo iniciar sesión';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
      }
    });
  }

}
