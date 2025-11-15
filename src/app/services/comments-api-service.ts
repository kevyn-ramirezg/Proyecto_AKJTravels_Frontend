// src/app/services/comments-api-service.ts
import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_BASE } from '../core/api-base-token';
import { ResponseDTO } from '../model/response-dto';

export interface ReplyDTO {
  reply: string;
}

// Payload para crear comentario (usuario/huesped)
export interface CreateCommentPayload {
  rating: number;
  comment: string;
}

@Injectable({ providedIn: 'root' })
export class CommentsApiService {

  /**
   * api = http://localhost:8080/api  (environment.apiBase)
   * baseUrl = http://localhost:8080/api/comments
   */
  private readonly baseUrl: string;

  constructor(
    private http: HttpClient,
    @Inject(API_BASE) private api: string
  ) {
    this.baseUrl = `${this.api}/comments`;
  }

  // ===============================
  // 1) RESPONDER COMENTARIO (HOST)
  // ===============================
  reply(commentId: string, replyText: string): Observable<string> {
    const body: ReplyDTO = { reply: replyText };
    const url = `${this.baseUrl}/${commentId}/reply`;

    return this.http
      .post<ResponseDTO<string>>(url, body)
      .pipe(map(res => res.message));
  }

  // =====================================
  // 2) CREAR COMENTARIO (HUESPED / USER)
  // Endpoint backend: POST /api/places/{placeId}/comments
  // =====================================
  createForPlace(
    placeId: string,
    payload: CreateCommentPayload
  ): Observable<string> {
    const url = `${this.api}/places/${placeId}/comments`;

    return this.http
      .post<ResponseDTO<string>>(url, payload)
      .pipe(map(res => res.message));
  }

}
