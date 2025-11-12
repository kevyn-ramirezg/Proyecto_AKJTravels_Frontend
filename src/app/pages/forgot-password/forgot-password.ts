// src/app/pages/forgot-password/forgot-password.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormControl,
  FormGroup
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';

import {
  AuthRegisterService,
  RequestResetPasswordDTO,
  ResetPasswordDTO
} from '../../services/auth-service';

type RequestForm = FormGroup<{ email: FormControl<string>; }>;
type ResetForm = FormGroup<{
  email: FormControl<string>;
  code: FormControl<string>;
  newPassword: FormControl<string>;
  confirm: FormControl<string>;
}>;

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPassword {
  paso: 'solicitar' | 'restablecer' = 'solicitar';
  cargando = false;

  solicitarForm: RequestForm;
  restablecerForm: ResetForm;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthRegisterService
  ) {
    this.solicitarForm = this.fb.nonNullable.group({
      email: this.fb.nonNullable.control('', { validators: [Validators.required, Validators.email] }),
    });

    this.restablecerForm = this.fb.nonNullable.group({
      email: this.fb.nonNullable.control('', { validators: [Validators.required, Validators.email] }),
      code: this.fb.nonNullable.control('', { validators: [Validators.required, Validators.minLength(4)] }),
      newPassword: this.fb.nonNullable.control('', { validators: [Validators.required, Validators.minLength(6)] }),
      confirm: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    });
  }

  solicitar(): void {
    if (this.solicitarForm.invalid) { this.solicitarForm.markAllAsTouched(); return; }

    const email = this.solicitarForm.value.email!;
    this.cargando = true;

    this.authService.requestResetPassword({ email } as RequestResetPasswordDTO).subscribe({
      next: (msg: string) => {
        this.cargando = false;
        Swal.fire({ icon: 'success', title: 'Código enviado', text: msg || 'Revisa tu correo. Válido 15 min.' });
        this.restablecerForm.patchValue({ email });
        this.restablecerForm.get('email')?.disable();
        this.paso = 'restablecer';
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        const text = (typeof err?.error === 'string' && err.error) || err?.error?.message || 'No pudimos enviar el código.';
        Swal.fire({ icon: 'error', title: 'Error', text });
      }
    });
  }

  restablecer(): void {
    const raw = this.restablecerForm.getRawValue();

    if (raw.newPassword !== raw.confirm) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'Las contraseñas no coinciden.' });
      return;
    }
    if (this.restablecerForm.invalid) { this.restablecerForm.markAllAsTouched(); return; }

    this.cargando = true;

    this.authService.resetPassword({
      email: raw.email,
      code: raw.code,
      newPassword: raw.newPassword
    } as ResetPasswordDTO).subscribe({
      next: (msg: string) => {
        this.cargando = false;
        Swal.fire({ icon: 'success', title: 'Contraseña actualizada', text: msg || 'Ahora puedes iniciar sesión.' })
          .then(() => this.router.navigate(['/login']));
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        const text = (typeof err?.error === 'string' && err.error) || err?.error?.message || 'No fue posible restablecer la contraseña.';
        Swal.fire({ icon: 'error', title: 'Error', text });
      }
    });
  }

  volverLogin(): void { this.router.navigate(['/login']); }
}
