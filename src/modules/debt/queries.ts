import { prisma } from '../../database/client';
import type { Debt } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { DebtInput } from './types';

export async function createDebt(data: DebtInput) {
  return prisma.debt.create({
    data: {
      userId: data.userId,
      creditor: encrypt(data.creditor) || '',
      amount: data.amount,
      deadline: data.deadline,
      paid: false,
    },
  });
}

export async function getDebts(userId: string) {
  const debts = await prisma.debt.findMany({
    where: { userId, paid: false },
    orderBy: { deadline: 'asc' },
  });
  
  return debts.map((d: Debt) => ({ ...d, creditor: decrypt(d.creditor) || '' }));
}
