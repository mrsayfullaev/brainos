import { prisma } from '../../database/client';
import type { Place } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { PlaceInput } from './types';

export async function createPlace(data: PlaceInput) {
  return prisma.place.create({
    data: {
      userId: data.userId,
      name: encrypt(data.name) || '',
      address: data.address ? encrypt(data.address) : null,
      category: data.category,
      rating: data.rating,
      notes: data.notes ? encrypt(data.notes) : null,
      visited: false,
    },
  });
}

export async function getPlaces(userId: string) {
  const places = await prisma.place.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  
  return places.map((p: Place) => ({
    ...p,
    name: decrypt(p.name) || '',
    address: p.address ? decrypt(p.address) : null,
    notes: p.notes ? decrypt(p.notes) : null,
  }));
}
