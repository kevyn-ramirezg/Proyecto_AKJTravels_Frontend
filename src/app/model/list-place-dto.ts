export interface ListPlaceDTO {
  city?: string;
  checkIn?: string;        // ISO string (backend usa LocalDateTime)
  checkOut?: string;
  guest_number?: number;
  minimum?: number;
  maximum?: number;
  list?: string[];
}
