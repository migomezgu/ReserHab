/**
 * Helper functions to generate Firestore collection paths
 * Ensures consistent path generation across the application
 */

export const colRooms = (hotelId: string) => `hotels/${hotelId}/rooms`;
export const colClients = (hotelId: string) => `hotels/${hotelId}/clients`;
export const colReservations = (hotelId: string) => `hotels/${hotelId}/reservations`;
export const colCashbox = (hotelId: string) => `hotels/${hotelId}/cashbox`;
