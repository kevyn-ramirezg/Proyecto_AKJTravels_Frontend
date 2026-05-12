/**
 * DTO para información de usuario en respuestas de API
 * Usado en PlaceDetailDTO como userDetailDTO
 */
export interface UserDetailDTO {
  id?: string;
  name?: string;
  lastName?: string;
  fullName?: string;
  nombreCompleto?: string;
  username?: string;
  email?: string;
  phone?: string;
  telefono?: string;
  avatar?: string;
  profileImage?: string;
  profilePicUrl?: string;
  photoUrl?: string;
  avatarUrl?: string;
  imageUrl?: string;
  role?: string;
  createdAt?: string;
}
