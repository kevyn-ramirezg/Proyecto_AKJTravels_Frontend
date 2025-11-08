import { LocationDTO } from './place-dto';

export interface MarkerDTO {
  id: number,
  location: LocationDTO,
  title: string,
  photoUrl: string

}
