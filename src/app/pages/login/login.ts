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
    // Obtenemos los datos del formulario y los convertimos a LoginDTO
    const loginDTO = this.loginForm.value as LoginDTO;

    this.authService.login(loginDTO).subscribe({
      next: (data) => {
        this.tokenService.login(data.message.token); // Guardamos el token usando el servicio de token
        this.router.navigate(['/']); // Redireccionamos al inicio y recargamos la página
      },
      error: (err) => {
        // Tu backend envía ResponseDTO{ error, message }
        const msg = err?.error?.message ?? 'No se pudo iniciar sesión';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
      }
    });
  }
}
