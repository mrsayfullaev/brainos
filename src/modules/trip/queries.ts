import { prisma } from '../../database/client';
import type { Trip } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { TripInput } from './types';

export async function createTrip(data: TripInput) {
  return prisma.trip.create({
    data: {
      userId: data.userId,
      destination: encrypt(data.destination) || '',
      startDate: data.startDate,
      endDate: data.endDate,
      notes: data.notes ? encrypt(data.notes) : null,
      completed: false,
    },
  });
}

export async function getTrips(userId: string) {
  const trips = await prisma.trip.findMany({
    where: { userId },
    orderBy: { startDate: 'desc' },
  });
  
  return trips.map((t: Trip) => ({
    ...t,
    destination: decrypt(t.destination) || '',
    notes: t.notes ? decrypt(t.notes) : null,
  }));
}
