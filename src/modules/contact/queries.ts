import { prisma } from '../../database/client';
import type { Contact } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { ContactInput } from './types';

export async function createContact(data: ContactInput) {
  return prisma.contact.create({
    data: {
      userId: data.userId,
      name: encrypt(data.name) || '',
      phone: data.phone ? encrypt(data.phone) : null,
      email: data.email ? encrypt(data.email) : null,
      notes: data.notes ? encrypt(data.notes) : null,
    },
  });
}

export async function getContacts(userId: string) {
  const contacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
  
  return contacts.map((c: Contact) => ({
    ...c,
    name: decrypt(c.name) || '',
    phone: c.phone ? decrypt(c.phone) : null,
    email: c.email ? decrypt(c.email) : null,
    notes: c.notes ? decrypt(c.notes) : null,
  }));
}
