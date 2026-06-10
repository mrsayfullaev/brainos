import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createTrip, getTrips } from './queries';

export async function handleTripMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const destination = message.replace(/поездк|trip/gi, '').trim() || 'Unknown';
  
  const startDate = new Date();
  
  await createTrip({ userId: user.id, destination, startDate });
  
  const trips = await getTrips(user.id);
  const upcoming = trips.filter((t: any) => !t.completed && t.startDate > new Date()).length;
  
  return {
    modulePrompt: `Trip saved. Upcoming trips: ${upcoming}. Confirm in ${user.language}.`,
  };
}
