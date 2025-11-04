import { Component } from '@angular/core';
import { AbstractControlOptions, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
  registerForm!: FormGroup;

  constructor(private fb: FormBuilder) {
    this.createForm();
  }

  private createForm(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(60)]],
      surname: ['', [Validators.maxLength(60)]],
      phone: ['', [
        Validators.required,
        Validators.pattern(/^\d{7,10}$/)   // 7–10 dígitos
      ]],
      photoUrl: [''],
      dateBirth: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      role: ['Huésped', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64)]],
      repeatPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64)]]
    }, { validators: this.passwordsMatchValidator } as AbstractControlOptions);
  }

  private passwordsMatchValidator(form: FormGroup) {
    const p1 = form.get('password')?.value;
    const p2 = form.get('repeatPassword')?.value;
    return p1 === p2 ? null : { passwordsMismatch: true };
  }

  public createUser(): void {
    if (this.registerForm.invalid) return;
    console.log(this.registerForm.value);
    // TODO: llamar a tu servicio de registro aquí
  }
}
