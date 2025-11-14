// src/app/services/comments-api-service.ts
import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_BASE } from '../core/api-base-token';
import { ResponseDTO } from '../model/response-dto';


export interface ReplyDTO {
  reply: string;
}




@Injectable({ providedIn: 'root' })
export class CommentsApiService {

  private readonly baseUrl: string; // /api/comments

  constructor(
    private http: HttpClient,
    @Inject(API_BASE) private api: string
  ) {
    this.baseUrl = `${this.api}/comments`;
  }

  reply(commentId: string, reply: string, userId: string): Observable<string> {
    const body: ReplyDTO = { reply };

    return this.http
      .post<ResponseDTO<string>>(
        `${this.baseUrl}/${commentId}/reply/${userId}`,
        body
      )
      .pipe(map(res => res.message));
  }

}
