export interface UserCommentDTO {
  id: string;
  name: string;
  fullName?: string;
  email?: string;
  photoUrl?: string | null;
  profilePicUrl?: string | null;
}
