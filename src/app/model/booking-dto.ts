export interface BookingDTO {
  bookingState: BookingState;
  user: BookingUserDTO;
  checkIn: string;    // LocalDate -> ISO
  checkOut: string;   // LocalDate -> ISO
  guest_number: number;
}
export type BookingState = 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED';
export type Role = 'USER' | 'HOST';
export interface BookingUserDTO {
  name: string;
  email: string;
  photoUrl: string | null;
  birthDate: string | null;       // LocalDate → ISO (YYYY-MM-DD)
  role: Role ;
  createdAt: string;              // LocalDateTime → ISO
}
export interface SearchBookingsParams {
  state?: BookingState; // 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED'
  from?: string;        // ISO 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm:ss'
  to?: string;          // ISO
  guest_number?: number;
  page?: number;        // si tu endpoint lo soporta
}

