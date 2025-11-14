// src/app/services/comments-api-service.ts
import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_BASE } from '../core/api-base-token';
import { ResponseDTO } from '../model/response-dto';
import {TokenService} from './token-service';


export interface ReplyDTO {
  reply: string;
}




@Injectable({ providedIn: 'root' })
export class CommentsApiService {

  private readonly baseUrl: string; // /api/comments

  constructor(
    private http: HttpClient,
    @Inject(API_BASE) private api: string,
    private token: TokenService
  ) {
    this.baseUrl = `${this.api}/comments`;
  }

  reply(commentId: string, replyText: string): Observable<string> {
    const body: ReplyDTO = { reply: replyText };

    // ⚠️ tu CommentController actual está en:
    // POST /api/comments/{commentId}/reply/{idUser}
    const userId = this.token.getUserId();
    const url = `${this.baseUrl}/${commentId}/reply`;

    return this.http
      .post<ResponseDTO<string>>(url, body)
      .pipe(map(res => res.message));
  }

}
