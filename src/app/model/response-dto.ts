export interface ResponseDTO<T=any> {
  error: boolean;
  message: T;
}
