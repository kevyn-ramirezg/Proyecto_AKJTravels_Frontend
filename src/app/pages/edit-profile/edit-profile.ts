import { Component, OnInit, computed, inject, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../core/api-base-token';
import Swal from 'sweetalert2';

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

  cargando = signal(true);
  guardando = signal(false);
  errorMsg = signal<string | null>(null);

  me = signal<{ id: string; email: string } | null>(null);
  avatarUrl = signal<string | null>(null);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    lastName: ['', [Validators.maxLength(60)]],
    phone: ['', [Validators.pattern(/^[0-9\-\+\s]{7,20}$/)]],
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email, Validators.maxLength(120)]],
  });

  fullName = computed(() => {
    const v = this.form.value;
    return `${v.name ?? ''} ${v.lastName ?? ''}`.trim() || 'Usuario';
  });

  async ngOnInit() { await this.cargarMe(); }

  private async cargarMe() {
    this.cargando.set(true);
    this.errorMsg.set(null);
    try {
      const resp = await firstValueFrom(
        this.http.get<ResponseDTO<MePayload>>(`${this.apiBase}/auth/me`)
      );
      const d = resp.message || ({} as MePayload);

      this.me.set({ id: d.id!, email: d.email ?? '' });
      this.avatarUrl.set(d.photoUrl ?? null);

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

  submit() {
    if (!this.me()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.errorMsg.set(null);

    const id = this.me()!.id;
    const { name, lastName, phone } = this.form.getRawValue() as any;
    const body: any = { name, lastName, phone };

    firstValueFrom(this.http.put<ResponseDTO<string>>(`${this.apiBase}/users/${id}`, body))
      .then(() => {
        this.guardando.set(false);
        Swal.fire({ icon: 'success', title: '¡Listo!', text: 'Perfil actualizado correctamente' });
        this.cargarMe();
      })
      .catch((err) => {
        console.error('[EditProfile] PUT error:', err?.status, err?.error);
        this.guardando.set(false);
        const backendMsg = 'Ocurrió un error. Por favor intenta más tarde.';
        this.errorMsg.set(backendMsg || 'No se pudo guardar. Revisa los datos o intenta más tarde.');
      });
  }

  cancelar() { this.router.navigateByUrl('/'); }

  async cambiarPassword() {
    const id = this.me()?.id;
    if (!id) return;

    const html = `
      <div style="display:grid;grid-template-columns:170px 1fr;gap:12px;align-items:center;margin-top:6px">
        <label style="font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#667085">Contraseña actual</label>
        <input id="sw-old" type="password" class="swal2-input" style="margin:0;height:42px" placeholder="••••••••">

        <label style="font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#667085">Nueva contraseña</label>
        <input id="sw-new" type="password" class="swal2-input" style="margin:0;height:42px" placeholder="Mín. 8, 1 mayúscula y 1 dígito">

        <label style="font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#667085">Confirmar contraseña</label>
        <input id="sw-conf" type="password" class="swal2-input" style="margin:0;height:42px" placeholder="Repítela">
      </div>
    `;

    const { value: payload } = await Swal.fire<{ old_password: string; new_password: string; }>({
      title: 'Cambiar contraseña',
      html,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      cancelButtonText: 'Cancelar',
      buttonsStyling: false,
      customClass: { confirmButton: 'btn btn-gradient', cancelButton: 'btn btn-ghost' },
      preConfirm: () => {
        const oldPwd = (document.getElementById('sw-old') as HTMLInputElement)?.value?.trim();
        const newPwd = (document.getElementById('sw-new') as HTMLInputElement)?.value?.trim();
        const conf   = (document.getElementById('sw-conf') as HTMLInputElement)?.value?.trim();

        if (!oldPwd || !newPwd || !conf) { Swal.showValidationMessage('Todos los campos son obligatorios'); return; }
        if (newPwd.length < 8) { Swal.showValidationMessage('La nueva contraseña debe tener mínimo 8 caracteres'); return; }
        if (!/[A-Z]/.test(newPwd) || !/\d/.test(newPwd)) { Swal.showValidationMessage('Debe incluir al menos una mayúscula y un dígito'); return; }
        if (newPwd !== conf) { Swal.showValidationMessage('Las contraseñas no coinciden'); return; }
        return { old_password: oldPwd, new_password: newPwd };
      }
    });

    if (!payload) return;

    this.guardando.set(true);
    try {
      const resp = await firstValueFrom(
        this.http.patch<ResponseDTO<string>>(`${this.apiBase}/users/${id}`, payload)
      );
      this.guardando.set(false);
      Swal.fire({
        icon: 'success',
        title: 'Contraseña actualizada',
        text: (typeof resp.message === 'string' && resp.message) || 'Tu contraseña ha sido cambiada correctamente.'
      });
    } catch (err: any) {
      this.guardando.set(false);
      const msg = 'No fue posible actualizar la contraseña. Por favor inténtalo de nuevo.';
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
    }
  }

  // ===== SUBIR / ACTUALIZAR FOTO =====
  async onAvatarChange(ev: Event) {
    const id = this.me()?.id;
    if (!id) return;

    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const okType = /^image\/(jpeg|png|webp|gif|jpg)$/i.test(file.type);
    if (!okType) { Swal.fire({icon:'warning',title:'Formato inválido',text:'Usa JPG, PNG, WEBP o GIF.'}); input.value=''; return; }
    if (file.size > 5 * 1024 * 1024) { Swal.fire({icon:'warning',title:'Archivo muy grande',text:'Máximo 5 MB.'}); input.value=''; return; }

    // Preview instantáneo con blob:
    this.avatarUrl.set(URL.createObjectURL(file));

    const form = new FormData();
    form.append('file', file);

    this.guardando.set(true);
    try {
      await firstValueFrom(this.http.post<ResponseDTO<string>>(`${this.apiBase}/users/${id}/photo`, form));
      Swal.fire({ icon: 'success', title: 'Foto actualizada', text: 'Se cambió tu avatar correctamente.' });
      await this.cargarMe(); // refresca la URL canónica del backend (Cloudinary)
    } catch (err: any) {
      const msg = 'No fue posible actualizar la foto. Inténtalo de nuevo.';
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
    } finally {
      this.guardando.set(false);
      input.value = '';
    }
  }
}
