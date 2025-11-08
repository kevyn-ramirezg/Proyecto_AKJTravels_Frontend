import {LocationDTO} from './place-dto';

export interface MarkerDTO {
  id: string,
  location: LocationDTO,
  title: string,
  photoUrl: string,

}
