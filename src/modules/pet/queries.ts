/**
 * Pets Module - Queries (V3)
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';

export async function createPet(params: {
  userId: string;
  name: string;
  species: string;
  breed?: string;
  birthDate?: Date;
}) {
  const encName = encrypt(params.name);
  const encSpecies = encrypt(params.species);
  if (!encName || !encSpecies) throw new Error('Encryption failed');
  return prisma.pet.create({
    data: {
      userId: params.userId,
      name: encName,
      species: encSpecies,
      breed: params.breed ? encrypt(params.breed) : null,
      birthDate: params.birthDate,
    },
  });
}

export async function getPets(userId: string) {
  const pets = await prisma.pet.findMany({ where: { userId } });
  return pets.map((p) => ({
    ...p,
    name: decrypt(p.name) || '',
    species: decrypt(p.species) || '',
    breed: p.breed ? decrypt(p.breed) : null,
  }));
}

export async function addVaccination(petId: string, userId: string, name: string, date: Date, nextDue?: Date) {
  const pet = await prisma.pet.findFirst({ where: { id: petId, userId } });
  if (!pet) throw new Error('Pet not found');
  return prisma.vaccination.create({
    data: { petId, name: encrypt(name) || name, date, nextDue },
  });
}

export async function getUpcomingVaccinations(daysAhead = 14) {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + daysAhead);
  const list = await prisma.vaccination.findMany({
    where: { nextDue: { gte: start, lte: end } },
    include: { pet: { include: { user: true } } },
  });
  return list.map((v) => ({
    ...v,
    name: decrypt(v.name) || '',
    petName: decrypt(v.pet.name) || '',
    telegramId: v.pet.user.telegramId,
  }));
}
