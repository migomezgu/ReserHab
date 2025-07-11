import { Timestamp, query, where, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { colReservations } from './paths'

export async function isRoomFree(hotelId:string, roomId:string, start:Timestamp, end:Timestamp, excludeReservationId?: string){
  const q = query(
    collection(db, colReservations(hotelId)),
    where('rooms','array-contains',roomId),
    where('startDate','<=', end),
    where('endDate','>=', start),
    where('status','in', ['unconfirmed','confirmed','paid'])
  )
  const snap = await getDocs(q)
  
  // Filter out the current reservation if we're editing
  const conflicting = snap.docs.filter(doc => doc.id !== excludeReservationId)
  return conflicting.length === 0
}

export const reservationStatuses = [
  { value: 'unconfirmed', label: 'Sin confirmar' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'paid', label: 'Pagada' },
  { value: 'cancelled', label: 'Cancelada' }
]

export const reservationChannels = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'web', label: 'Web' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'other', label: 'Otro' }
]
