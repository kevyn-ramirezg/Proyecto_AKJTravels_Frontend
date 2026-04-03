import {UserCommentDTO} from './user.comment-dto';

export interface CommentDTO {
  id:  string;
  comment: string;
  commentDate: string; // viene como ISO, la mostramos con date pipe
  rating: number;
  user: UserCommentDTO;
  reply?: string | null; // Respuesta del anfitrión
  replyDate?: string | null; // Fecha de la respuesta
}
