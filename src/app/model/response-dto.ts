export interface ResponseDTO<T = any> {
  error: boolean;
  message: T;   // La guía usa 'content' (no 'message')
}
