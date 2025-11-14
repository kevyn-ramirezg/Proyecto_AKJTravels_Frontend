import {UserCommentDTO} from './user.comment-dto';

export interface CommentDTO {
  comment: string;
  commentDate: string; // viene como ISO, la mostramos con date pipe
  rating: number;
  user: UserCommentDTO;
}
