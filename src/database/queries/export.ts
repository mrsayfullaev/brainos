/**
 * Экспорт всех данных пользователя в JSON (GDPR Right to Data Portability).
 * Собирает данные из всех таблиц, связанных с userId, расшифровывает поля.
 */

import { prisma } from '../client';
import { decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';

/**
 * Экспортирует все данные пользователя в один JSON-объект.
 * @param userId — ID пользователя (User.id)
 * @returns Объект со всеми данными пользователя
 */
export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      telegramId: true,
      username: true,
      name: true,
      language: true,
      tone: true,
      length: true,
      emoji: true,
      structure: true,
      style: true,
      detail: true,
      customPrompt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const d = (s: string | null | undefined) => (s ? decrypt(s) : null);

  const [
    responses,
    transactions,
    budgets,
    tasks,
    reminders,
    notes,
    sleepRecords,
    waterIntakes,
    waterGoal,
    ideas,
    quotes,
    healthEntries,
    workouts,
    meals,
    vocabEntries,
    books,
    subscriptions,
    savingsGoals,
    debts,
    contacts,
    newsItems,
    trips,
    places,
    buyItems,
    knowledgePages,
    habits,
    investments,
    courses,
    emailDrafts,
    readLater,
    projects,
    cars,
    pets,
    planSubscription,
    meetings,
    notificationSettings,
    pendingNotifications,
    workflows,
    researchReports,
    notionConnection,
    notionLinkedDbs,
    emailAccounts,
    calendarConnection,
  ] = await Promise.all([
    prisma.aIResponse.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.budget.findMany({ where: { userId } }),
    prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.reminder.findMany({ where: { userId }, orderBy: { triggerAt: 'asc' } }),
    prisma.note.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.sleep.findMany({ where: { userId }, orderBy: { bedtime: 'desc' } }),
    prisma.waterIntake.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.waterGoal.findUnique({ where: { userId } }),
    prisma.idea.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.quote.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.healthEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.workout.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.meal.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.vocabEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.book.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
    prisma.subscription.findMany({ where: { userId }, orderBy: { nextPayment: 'asc' } }),
    prisma.savingsGoal.findMany({ where: { userId }, orderBy: { deadline: 'asc' } }),
    prisma.debt.findMany({ where: { userId }, orderBy: { deadline: 'asc' } }),
    prisma.contact.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.newsItem.findMany({ where: { userId }, orderBy: { savedAt: 'desc' } }),
    prisma.trip.findMany({ where: { userId }, orderBy: { startDate: 'desc' } }),
    prisma.place.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.buyItem.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.knowledgePage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.habit.findMany({ where: { userId }, include: { completions: true }, orderBy: { createdAt: 'desc' } }),
    prisma.investment.findMany({ where: { userId }, include: { transactions: true } }),
    prisma.course.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
    prisma.emailDraft.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.readLater.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.project.findMany({ where: { userId }, include: { milestones: true }, orderBy: { createdAt: 'desc' } }),
    prisma.car.findMany({ where: { userId }, include: { services: true, fuelLogs: true, fines: true } }),
    prisma.pet.findMany({ where: { userId }, include: { vaccinations: true, vetVisits: true, feedings: true } }),
    prisma.planSubscription.findUnique({ where: { userId } }),
    prisma.meeting.findMany({ where: { userId }, orderBy: { scheduledAt: 'desc' } }),
    prisma.notificationSettings.findUnique({ where: { userId } }),
    prisma.pendingNotification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.workflow.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.researchReport.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.notionConnection.findUnique({ where: { userId } }),
    prisma.notionLinkedDatabase.findMany({ where: { userId } }),
    prisma.emailAccount.findMany({ where: { userId } }),
    prisma.googleCalendarConnection.findUnique({ where: { userId } }),
  ]);

  // ProjectMember, WorkspaceMember — членство пользователя
  const [projectMemberships, workspaceMemberships] = await Promise.all([
    prisma.projectMember.findMany({ where: { userId }, include: { project: true } }),
    prisma.workspaceMember.findMany({ where: { userId }, include: { workspace: true } }),
  ]);

  // EmailThread через emailAccount
  const emailThreads = emailAccounts.length > 0
    ? await prisma.emailThread.findMany({
        where: { emailAccountId: { in: emailAccounts.map((a) => a.id) } },
        orderBy: { receivedAt: 'desc' },
      })
    : [];

  const result: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    user: {
      ...user,
      name: d(user.name as string | null),
      customPrompt: d(user.customPrompt as string | null),
      telegramId: user.telegramId.toString(),
    },
    aiResponses: responses,
    transactions: transactions.map((t) => ({
      ...t,
      description: d(t.description),
      category: d(t.category),
    })),
    budgets: budgets.map((b) => ({ ...b, category: d(b.category) })),
    tasks: tasks.map((t) => ({
      ...t,
      title: d(t.title),
      description: d(t.description),
    })),
    reminders: reminders.map((r) => ({ ...r, text: d(r.text) })),
    notes: notes.map((n) => ({ ...n, content: d(n.content) })),
    sleepRecords: sleepRecords.map((s) => ({ ...s, notes: d(s.notes) })),
    waterIntakes,
    waterGoal,
    ideas: ideas.map((i) => ({ ...i, content: d(i.content) })),
    quotes: quotes.map((q) => ({
      ...q,
      text: d(q.text),
      author: d(q.author),
      source: d(q.source),
    })),
    healthEntries: healthEntries.map((e) => ({ ...e, description: d(e.description) })),
    workouts: workouts.map((w) => ({ ...w, notes: d(w.notes) })),
    meals: meals.map((m) => ({ ...m, description: d(m.description) })),
    vocabEntries: vocabEntries.map((e) => ({
      ...e,
      word: d(e.word),
      translation: d(e.translation),
      context: d(e.context),
    })),
    books: books.map((b) => ({
      ...b,
      title: d(b.title),
      author: d(b.author),
    })),
    subscriptions: subscriptions.map((s) => ({ ...s, name: d(s.name) })),
    savingsGoals: savingsGoals.map((g) => ({ ...g, name: d(g.name) })),
    debts: debts.map((d0) => ({ ...d0, creditor: d(d0.creditor) })),
    contacts: contacts.map((c) => ({
      ...c,
      name: d(c.name),
      phone: d(c.phone),
      email: d(c.email),
      notes: d(c.notes),
    })),
    newsItems: newsItems.map((n) => ({ ...n, title: d(n.title) })),
    trips: trips.map((t) => ({
      ...t,
      destination: d(t.destination),
      notes: d(t.notes),
    })),
    places: places.map((p) => ({
      ...p,
      name: d(p.name),
      address: d(p.address),
      notes: d(p.notes),
    })),
    buyItems: buyItems.map((i) => ({ ...i, name: d(i.name) })),
    knowledgePages: knowledgePages.map((p) => ({
      ...p,
      title: d(p.title),
      content: d(p.content),
    })),
    habits: habits.map((h) => ({
      ...h,
      name: d(h.name),
      completions: h.completions.map((c) => ({ ...c, note: d(c.note) })),
    })),
    investments: investments.map((inv) => ({
      ...inv,
      transactions: inv.transactions.map((tx) => ({ ...tx, note: d(tx.note) })),
    })),
    courses: courses.map((c) => ({
      ...c,
      title: d(c.title),
      platform: d(c.platform),
      instructor: d(c.instructor),
      url: d(c.url),
      notes: d(c.notes),
    })),
    emailDrafts: emailDrafts.map((e) => ({
      ...e,
      subject: d(e.subject),
      body: d(e.body),
      recipient: d(e.recipient),
    })),
    readLater: readLater.map((r) => ({
      ...r,
      url: d(r.url),
      title: d(r.title),
      description: d(r.description),
      imageUrl: d(r.imageUrl),
    })),
    projects: projects.map((p) => ({
      ...p,
      name: d(p.name),
      description: d(p.description),
      milestones: p.milestones.map((m) => ({
        ...m,
        title: d(m.title),
        description: d(m.description),
      })),
    })),
    projectMemberships: projectMemberships.map((pm) => ({
      ...pm,
      project: pm.project
        ? {
            ...pm.project,
            name: d(pm.project.name),
            description: d(pm.project.description),
          }
        : null,
    })),
    workspaceMemberships: workspaceMemberships.map((wm) => ({
      ...wm,
      workspace: wm.workspace ? { ...wm.workspace, name: d(wm.workspace.name) } : null,
    })),
    cars: cars.map((car) => ({
      ...car,
      make: d(car.make),
      model: d(car.model),
      licensePlate: d(car.licensePlate),
      vin: d(car.vin),
      services: car.services.map((s) => ({ ...s, description: d(s.description) })),
      fines: car.fines.map((f) => ({ ...f, reason: d(f.reason) })),
    })),
    pets: pets.map((pet) => ({
      ...pet,
      name: d(pet.name),
      species: d(pet.species),
      breed: d(pet.breed),
      vaccinations: pet.vaccinations.map((v) => ({
        ...v,
        name: d(v.name),
        veterinarian: d(v.veterinarian),
      })),
      vetVisits: pet.vetVisits.map((v) => ({
        ...v,
        reason: d(v.reason),
        diagnosis: d(v.diagnosis),
        treatment: d(v.treatment),
      })),
      feedings: pet.feedings.map((f) => ({ ...f, foodType: d(f.foodType) })),
    })),
    planSubscription,
    meetings: meetings.map((m) => ({
      ...m,
      title: d(m.title),
      participants: m.participants,
      location: d(m.location),
      agenda: d(m.agenda),
      transcript: d(m.transcript),
      summary: d(m.summary),
    })),
    notificationSettings: notificationSettings ?? null,
    pendingNotifications: pendingNotifications.map((n) => ({ ...n, message: d(n.message) })),
    workflows: workflows.map((w) => ({
      ...w,
      name: d(w.name),
      description: d(w.description),
    })),
    researchReports: researchReports.map((r) => ({
      ...r,
      query: d(r.query),
      report: d(r.report),
    })),
    notionConnection: notionConnection
      ? { id: notionConnection.id, userId: notionConnection.userId, workspaceId: notionConnection.workspaceId }
      : null,
    notionLinkedDbs: notionLinkedDbs,
    emailAccounts: emailAccounts.map((a) => ({
      id: a.id,
      userId: a.userId,
      email: a.email,
      lastSyncAt: a.lastSyncAt,
    })),
    emailThreads: emailThreads.map((t) => ({
      ...t,
      subject: d(t.subject),
      snippet: d(t.snippet),
      fromAddress: d(t.fromAddress),
    })),
    calendarConnection: calendarConnection
      ? {
          id: calendarConnection.id,
          userId: calendarConnection.userId,
        }
      : null,
  };

  logger.info(`User data export completed: userId=${userId}`);
  return result;
}
