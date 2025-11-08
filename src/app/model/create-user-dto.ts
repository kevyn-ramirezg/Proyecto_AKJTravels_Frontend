export type Role = 'USER' | 'HOST';

export interface CreateUserDTO {
  name: string;
  surname: string;
  email: string;
  phone: string;
  birthDate: string;     // yyyy-MM-dd
  password: string;
  role: Role;
  country: string;       // <-- requerido por el backend
  photoUrl: string;
}
