// src/app/pages/forgot-password/forgot-password.ts
import { Component, OnDestroy } from '@angular/core';
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
import { interval, Subscription } from 'rxjs';

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
export class ForgotPassword implements OnDestroy {
  paso: 'solicitar' | 'restablecer' = 'solicitar';
  cargando = false;

  // contador 15:00
  remainingSec = 0;
  private timerSub?: Subscription;
  get mm() { return String(Math.floor(this.remainingSec / 60)).padStart(2, '0'); }
  get ss() { return String(this.remainingSec % 60).padStart(2, '0'); }
  get expirado() { return this.remainingSec === 0; }

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

  ngOnDestroy(): void { this.stopTimer(); }

  private extractMessage(msg: string): string {
    try {
      const parsed = JSON.parse(msg);
      return parsed.Message || parsed.message || msg;
    } catch {
      return msg || 'Código enviado correctamente';
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.remainingSec = 15 * 60; // 15 minutos
    this.timerSub = interval(1000).subscribe(() => {
      if (this.remainingSec > 0) this.remainingSec--;
      else this.stopTimer();
    });
  }

  private stopTimer(): void {
    this.timerSub?.unsubscribe();
    this.timerSub = undefined;
  }

  solicitar(): void {
    if (this.solicitarForm.invalid) { this.solicitarForm.markAllAsTouched(); return; }

    const email = this.solicitarForm.value.email!;
    this.cargando = true;

    this.authService.requestResetPassword({ email } as RequestResetPasswordDTO).subscribe({
      next: (msg: string) => {
        this.cargando = false;
        const cleanMsg = this.extractMessage(msg);
        Swal.fire({ icon: 'success', title: 'Código enviado', text: cleanMsg || 'Revisa tu correo. Válido 15 min.' });
        this.restablecerForm.patchValue({ email });
        this.restablecerForm.get('email')?.disable();
        this.paso = 'restablecer';
        this.startTimer(); // inicia contador
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        const text = 'No pudimos enviar el código. Verifica que el correo sea correcto e intenta de nuevo.';
        Swal.fire({ icon: 'error', title: 'Error', text });
      }
    });
  }

  reenviar(): void {
    const email = this.restablecerForm.getRawValue().email;
    if (!email) return;
    this.cargando = true;
    this.authService.requestResetPassword({ email } as RequestResetPasswordDTO).subscribe({
      next: () => {
        this.cargando = false;
        Swal.fire({ icon: 'info', title: 'Nuevo código enviado', text: 'Revisa tu correo para el nuevo código.' });
        this.startTimer(); // reinicia contador
      },
      error: () => {
        this.cargando = false;
        Swal.fire({ icon: 'error', title: 'No se pudo reenviar el código' });
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
        this.stopTimer();
        const cleanMsg = this.extractMessage(msg);
        Swal.fire({ icon: 'success', title: 'Contraseña actualizada', text: cleanMsg || 'Ahora puedes iniciar sesión.' })
          .then(() => this.router.navigate(['/login']));
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        const text = 'No fue posible restablecer la contraseña. Por favor intenta de nuevo.';
        Swal.fire({ icon: 'error', title: 'Error', text });
      }
    });
  }

  volverLogin(): void { this.router.navigate(['/login']); }
}
