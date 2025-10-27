import { Component } from '@angular/core';
import {FormBuilder, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  loginForm!: FormGroup;
  hide = true;
  loading = false;
  error: string | null = null;

  constructor(private formBuilder: FormBuilder, private router: Router) {
    this.createForm();
  }

  private createForm(){
    this.loginForm = this.formBuilder.group({
      email:['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      remember: [false]
    })
  }

  public toggleHide() {
    this.hide = !this.hide;
  }

  public onSubmit() {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.error = null;

    // Mock de envío: simula llamada al backend
    setTimeout(() => {
      this.loading = false;
      const { email, password } = this.loginForm.value;
      // Mock simple: acepta cualquier credencial que no esté vacía
      if (email && password) {
        // simulamos éxito y navegamos al inicio
        this.router.navigate(['/']);
      } else {
        this.error = 'Credenciales inválidas';
      }
    }, 900);
  }
}
