export type BookingState =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELED'
  | 'REJECTED'
  | 'COMPLETED';

export interface UserBookingDTO {
  id: string;
  bookingState: BookingState;
  checkIn: string;        // LocalDate → llega como "2025-09-05"
  checkOut: string;       // LocalDate
  guest_number: number;
  placeId: string;
  placeTitle: string;
  mainImage: string | null;
  capacity: number;
  hasBeenRated?: boolean; // Indica si ya fue calificada
}
