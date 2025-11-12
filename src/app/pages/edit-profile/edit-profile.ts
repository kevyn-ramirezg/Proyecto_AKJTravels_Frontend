import { Component, OnInit, computed, inject, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../core/api-base-token';

type ResponseDTO<T> = { error: boolean; message: T };

type MePayload = {
  id: string;
  name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  role?: string;
  createdAt?: string;
  birthDate?: string;
};

@Component({
  standalone: true,
  selector: 'app-edit-profile',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-profile.html',
  styleUrls: ['./edit-profile.css'],
})
export class EditProfile implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  constructor(@Inject(API_BASE) private apiBase: string) {}

  // estado
  cargando = signal(true);
  guardando = signal(false);
  errorMsg = signal<string | null>(null);

  // cache del usuario
  me = signal<{ id: string; email: string } | null>(null);

  // formulario
  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    lastName: ['', [Validators.maxLength(60)]], // puede venir vacío en tu backend
    phone: ['', [Validators.pattern(/^[0-9\-\+\s]{7,20}$/)]], // opcional si tu backend no lo maneja aún
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email, Validators.maxLength(120)]],
  });

  fullName = computed(() => {
    const v = this.form.value;
    return `${v.name ?? ''} ${v.lastName ?? ''}`.trim() || 'Usuario';
  });

  async ngOnInit() {
    await this.cargarMe();
  }

  // ===== CARGA PERFIL =====
  private async cargarMe() {
    this.cargando.set(true);
    this.errorMsg.set(null);

    try {
      const resp = await firstValueFrom(
        this.http.get<ResponseDTO<MePayload>>(`${this.apiBase}/auth/me`)
      );
      const d = resp.message || ({} as MePayload);

      // guarda id/email para futuras operaciones
      this.me.set({ id: d.id, email: d.email ?? '' });

      // rellena formulario (si lastName/phone no vienen, los deja en blanco)
      this.form.patchValue({
        name: d.name ?? '',
        lastName: d.lastName ?? '',
        phone: d.phone ?? '',
        email: d.email ?? '',
      });
    } catch (e) {
      console.error('[EditProfile] Error cargando perfil:', e);
      this.errorMsg.set('No fue posible cargar tu perfil.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ===== GUARDAR ======
  submit() {
    if (!this.me()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.errorMsg.set(null);

    const id = this.me()!.id;
    // Enviamos SOLO lo editable (email es readonly)
    const { name, lastName, phone } = this.form.getRawValue() as any;
    const body: any = { name, lastName, phone };

    firstValueFrom(
      this.http.put<ResponseDTO<string>>(`${this.apiBase}/users/${id}`, body)
    )
      .then(() => {
        this.guardando.set(false);
        alert('Perfil actualizado correctamente');
        this.cargarMe();
      })
      .catch((err) => {
        console.error('[EditProfile] PUT error:', err?.status, err?.error);
        this.guardando.set(false);
        const backendMsg = err?.error?.message ?? err?.error ?? null;
        this.errorMsg.set(
          backendMsg || 'No se pudo guardar. Revisa los datos o intenta más tarde.'
        );
      });
  }

  cancelar() {
    this.router.navigateByUrl('/');
  }

  cambiarPassword() {
    this.router.navigateByUrl('/auth/forgot-password');
  }

  onAvatarChange(_: Event) {
    // pendiente: endpoint para subir/actualizar foto
  }
}
