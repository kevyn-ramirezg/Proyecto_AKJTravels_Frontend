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
    const email = (this.loginForm.get('email')?.value ?? '').trim();
    const password = this.loginForm.get('password')?.value ?? '';

    this.authService.login({ email, password }).subscribe({
      next: ({ message }) => {
        this.tokenService.login(message.token);
        const role = this.tokenService.getRole();
        const returnUrl = this.router.parseUrl(this.router.url).queryParams['returnUrl'];
        if (returnUrl) { this.router.navigateByUrl(returnUrl); return; }
        this.router.navigate([role === 'HOST' ? '/host-dashboard' : '/']);
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'No se pudo iniciar sesión';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
      }
    });
  }

}
