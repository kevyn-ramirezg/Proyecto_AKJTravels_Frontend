import { Component } from '@angular/core';
import {
  AbstractControlOptions, FormBuilder, FormGroup, ReactiveFormsModule, Validators
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import{ CreateUserDTO } from '../../model/user-dto/create-user-dto';
import { Router, RouterLink } from '@angular/router';
import { AuthRegisterService } from '../../services/auth-service';
import {ResponseDTO} from '../../model/response-dto';
import * as Swal from 'sweetalert2';
import {UserService} from '../../services/user-service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
  registerForm!: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authRegister: AuthRegisterService,
    private router: Router,
    private userService: UserService
  ) {
    this.createForm();
  }

  // Getters para evaluación visual de criterios de contraseña
  get passwordValue(): string {
    return this.registerForm.get('password')?.value || '';
  }

  get repeatPasswordValue(): string {
    return this.registerForm.get('repeatPassword')?.value || '';
  }

  get hasMinLength(): boolean {
    return this.passwordValue.length >= 8;
  }

  get hasUpperCase(): boolean {
    return /[A-Z]/.test(this.passwordValue);
  }

  get passwordsMatch(): boolean {
    const p = this.passwordValue;
    const r = this.repeatPasswordValue;
    return p.length > 0 && r.length > 0 && p === r;
  }

  private createForm(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(60)]],
      surname: ['', [Validators.maxLength(60)]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{7,10}$/)]],
      photoUrl: [''],
      dateBirth: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      role: ['USER', [Validators.required]],  // ahora por defecto USER (enum correcto)
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(64),
          Validators.pattern(/^(?=.*[A-Z]).+$/) // 1 mayúscula
        ]
      ],
      repeatPassword: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(64)]
      ]
    }, { validators: this.passwordsMatchValidator } as AbstractControlOptions);
  }

  private passwordsMatchValidator(form: FormGroup) {
    const p1 = form.get('password')?.value;
    const p2 = form.get('repeatPassword')?.value;
    return p1 === p2 ? null : { passwordsMismatch: true };
  }

  private toIsoDateOnly(value: any): string {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  public createUser(): void {
    if (this.registerForm.invalid || this.loading) return;
    this.loading = true;

    const v = this.registerForm.value;
    const payload: CreateUserDTO = {
      name: v.name,
      surname: v.surname,
      email: v.email,
      phone: v.phone,
      birthDate: this.toIsoDateOnly(v.dateBirth),
      password: v.password,
      role: v.role,          // 'USER' / 'HOST'
      country: 'Colombia',   // <-- valor por defecto
      photoUrl: (v.photoUrl ?? '').trim() || '/assets/img/default-avatar.png'
    };

    this.authRegister.register(payload).subscribe({
      next: async (res: ResponseDTO<string>) => {
        this.loading = false;
        await Swal.default.fire({
          icon: 'success',
          title: '¡Registro exitoso!',
          text: res.message || 'Tu cuenta ha sido creada correctamente.'
        });
        this.router.navigateByUrl('/login');
      },
      error: async (err) => {
        this.loading = false;
        const msg = err?.error?.content ?? 'No fue posible completar el registro.';
        await Swal.default.fire({ icon: 'error', title: 'Ups...', text: msg });
      }
    });
  }
}
