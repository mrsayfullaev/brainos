/**
 * Car Module - Queries (V3)
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { ServiceType } from './types';

export async function createCar(params: {
  userId: string;
  make: string;
  model: string;
  year: number;
  licensePlate?: string;
}) {
  const encMake = encrypt(params.make);
  const encModel = encrypt(params.model);
  if (!encMake || !encModel) throw new Error('Encryption failed');
  return prisma.car.create({
    data: {
      userId: params.userId,
      make: encMake,
      model: encModel,
      year: params.year,
      licensePlate: params.licensePlate ? encrypt(params.licensePlate) : null,
    },
  });
}

export async function getCars(userId: string) {
  const cars = await prisma.car.findMany({ where: { userId } });
  return cars.map((c) => ({
    ...c,
    make: decrypt(c.make) || '',
    model: decrypt(c.model) || '',
    licensePlate: c.licensePlate ? decrypt(c.licensePlate) : null,
  }));
}

export async function addService(
  carId: string,
  userId: string,
  type: ServiceType,
  description?: string,
  mileage?: number,
  cost?: number
) {
  const car = await prisma.car.findFirst({ where: { id: carId, userId } });
  if (!car) throw new Error('Car not found');
  return prisma.carService.create({
    data: {
      carId,
      type,
      description: description ? encrypt(description) : null,
      mileage,
      cost,
    },
  });
}

export async function addFuelLog(carId: string, userId: string, liters: number, cost: number, mileage?: number) {
  const car = await prisma.car.findFirst({ where: { id: carId, userId } });
  if (!car) throw new Error('Car not found');
  return prisma.fuelLog.create({
    data: { carId, liters, cost, mileage, fullTank: true },
  });
}

export async function getCarSummary(carId: string, userId: string) {
  const car = await prisma.car.findFirst({
    where: { id: carId, userId },
    include: { services: true, fuelLogs: true, fines: true },
  });
  if (!car) return null;
  return {
    ...car,
    make: decrypt(car.make) || '',
    model: decrypt(car.model) || '',
    licensePlate: car.licensePlate ? decrypt(car.licensePlate) : null,
  };
}
