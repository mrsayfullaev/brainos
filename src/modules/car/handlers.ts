/**
 * Car Module - Handlers (V3)
 */

import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createCar, getCars, addService, addFuelLog } from './queries';
import type { ServiceType } from './types';

export async function handleCarMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const trimmed = message.replace(/^@car\s*/i, '').trim();

  if (/список|list|машин|cars/i.test(trimmed) && trimmed.length < 20) {
    const cars = await getCars(user.id);
    const lines = cars.map((c) => `• ${c.make} ${c.model} (${c.year})`).join('\n');
    return {
      modulePrompt: `Cars:\n${lines || 'None. Add: "машина Toyota Camry 2020"'}.\nReply in ${user.language}.`,
      data: { cars },
    };
  }

  if (/заправк|fuel|бензин|литр/i.test(trimmed)) {
    const cars = await getCars(user.id);
    const car = cars[0];
    if (!car) return { modulePrompt: `No car. Add one first. Reply in ${user.language}.` };
    const numMatch = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:л|литр|L)/i);
    const costMatch = trimmed.match(/(\d+)\s*(?:руб|₽|р\.|RUB)/i) || trimmed.match(/(\d+)\s*\$|USD/i);
    const liters = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : 0;
    const cost = costMatch ? parseFloat(costMatch[1]) : 0;
    if (liters > 0 && cost >= 0) {
      await addFuelLog(car.id, user.id, liters, cost);
      return { modulePrompt: `Fuel log: ${liters} L, ${cost}. Reply in ${user.language}.` };
    }
  }

  if (/сервис|service|масло|oil|замена/i.test(trimmed)) {
    const cars = await getCars(user.id);
    const car = cars[0];
    if (!car) return { modulePrompt: `No car. Add one first. Reply in ${user.language}.` };
    let type: ServiceType = 'OTHER';
    if (/масло|oil/i.test(trimmed)) type = 'OIL_CHANGE';
    else if (/шин|tire/i.test(trimmed)) type = 'TIRE_ROTATION';
    else if (/осмотр|inspection/i.test(trimmed)) type = 'INSPECTION';
    else if (/ремонт|repair/i.test(trimmed)) type = 'REPAIR';
    const desc = trimmed.replace(/сервис|service|масло|oil|замена|ремонт|осмотр/gi, '').trim();
    await addService(car.id, user.id, type, desc || undefined);
    return { modulePrompt: `Service (${type}) recorded. Reply in ${user.language}.` };
  }

  const yearMatch = trimmed.match(/(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  const parts = trimmed.replace(/машин|car|авто/gi, '').trim().split(/\s+/).filter(Boolean);
  const make = parts[0] || 'Unknown';
  const model = parts.slice(1).join(' ') || 'Model';
  await createCar({ userId: user.id, make, model, year });
  const total = (await getCars(user.id)).length;
  return { modulePrompt: `Car ${make} ${model} (${year}) added. Total: ${total}. Reply in ${user.language}.` };
}
