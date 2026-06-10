/**
 * Pets Module - Handlers (V3)
 */

import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createPet, getPets, addVaccination } from './queries';

export async function handlePetMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const trimmed = message.replace(/^@pet\s*/i, '').trim();

  if (/прививк|vaccination|вакцин/i.test(trimmed)) {
    const pets = await getPets(user.id);
    const pet = pets[0];
    if (!pet) return { modulePrompt: `No pets. Add one first. Reply in ${user.language}.` };
    const nameMatch = trimmed.match(/прививк[аи]?\s+(.+?)(?:\s+(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}))?/i) || trimmed.match(/vaccination\s+(.+)/i);
    const vaxName = nameMatch ? nameMatch[1].trim() : 'Прививка';
    const date = new Date();
    const nextDue = new Date(date);
    nextDue.setFullYear(nextDue.getFullYear() + 1);
    await addVaccination(pet.id, user.id, vaxName, date, nextDue);
    return { modulePrompt: `Vaccination "${vaxName}" recorded for ${pet.name}. Next due in 1 year. Confirm in ${user.language}.` };
  }

  if (/список|list|питомц|pets/i.test(trimmed) && trimmed.length < 20) {
    const pets = await getPets(user.id);
    const lines = pets.map((p) => `• ${p.name} (${p.species})`).join('\n');
    return { modulePrompt: `Pets:\n${lines || 'None. Add: "питомец Барсик кошка"'}.\nReply in ${user.language}.`, data: { pets } };
  }

  const parts = trimmed.split(/\s+/);
  const name = parts[0] || 'Питомец';
  const species = parts[1] || 'животное';
  await createPet({ userId: user.id, name, species });
  const total = (await getPets(user.id)).length;
  return { modulePrompt: `Pet "${name}" (${species}) added. Total: ${total}. Reply in ${user.language}.` };
}
