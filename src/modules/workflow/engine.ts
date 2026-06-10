/**
 * V4 Workflow Engine — выполнение сценариев по триггерам
 */

import { prisma } from '../../database/client';
import { raceAIProviders } from '../../ai/race';
import { buildSystemPrompt } from '../systemPrompt';
import { sendNotification } from '../notify/send';
import { logger } from '../../utils/logger';

type TriggerPayload = { type: string; module?: string; event?: string };
type Condition = { field: string; operator: string; value: unknown };
type Action = { type: string; [key: string]: unknown };

function evaluateConditions(conditions: Condition[] | null, data: Record<string, unknown>): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((cond) => {
    const v = data[cond.field];
    switch (cond.operator) {
      case 'equals':
        return v === cond.value;
      case 'contains':
        return typeof v === 'string' && typeof cond.value === 'string' && v.includes(cond.value);
      case 'greater_than':
        return typeof v === 'number' && typeof cond.value === 'number' && v > cond.value;
      case 'less_than':
        return typeof v === 'number' && typeof cond.value === 'number' && v < cond.value;
      default:
        return false;
    }
  });
}

async function executeAction(
  action: Action,
  data: Record<string, unknown>,
  userId: string
): Promise<Record<string, unknown>> {
  switch (action.type) {
    case 'ai_process': {
      const prompt = (action.prompt as string) ?? '';
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return data;
      const systemPrompt = buildSystemPrompt(user);
      const input = JSON.stringify(data);
      const result = await raceAIProviders(
        systemPrompt,
        `${prompt}\n\nData: ${input}`,
        user.language
      );
      return { ...data, processed: result.winner.response };
    }
    case 'send_notification': {
      const message = (action.message as string) ?? (data.message as string) ?? 'Уведомление';
      await sendNotification(userId, message, 'NORMAL', 'workflow');
      return { ...data, notificationSent: true };
    }
    case 'create_task': {
      // Заглушка: создание задачи через существующий модуль task
      const title = (action.taskTitle as string) ?? (data.title as string) ?? 'From workflow';
      logger.info(`Workflow create_task stub: ${title} for user ${userId}`);
      return { ...data, taskCreated: true };
    }
    case 'save_to':
      logger.info(`Workflow save_to stub: module=${action.module} for user ${userId}`);
      return { ...data, saved: true };
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

/**
 * Запускает один workflow с данными триггера
 */
export async function executeWorkflow(
  workflowId: string,
  triggerData: Record<string, unknown>
): Promise<void> {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });
  if (!workflow || !workflow.enabled) return;

  const conditions = workflow.conditions as Condition[] | null;
  const actions = workflow.actions as Action[];

  if (!evaluateConditions(conditions, triggerData)) return;

  const steps: Record<string, unknown>[] = [];
  let currentData: Record<string, unknown> = { ...triggerData, userId: workflow.userId };

  try {
    for (const action of actions) {
      const result = await executeAction(action, currentData, workflow.userId);
      steps.push({ action: action.type, success: true });
      currentData = { ...(result as Record<string, unknown>), userId: workflow.userId };
    }

    await prisma.workflowRun.create({
      data: {
        workflowId,
        input: triggerData as object,
        output: currentData as object,
        steps: steps as object,
        status: 'SUCCESS',
      },
    });
    await prisma.workflow.update({
      where: { id: workflowId },
      data: { runCount: { increment: 1 }, lastRun: new Date() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Workflow ${workflowId} failed:`, message);
    await prisma.workflowRun.create({
      data: {
        workflowId,
        input: triggerData as object,
        steps: steps as object,
        status: 'FAILED',
        error: message,
      },
    });
  }
}

/**
 * Вызывает все workflow, подходящие под module + event
 */
export async function triggerWorkflows(
  module: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const workflows = await prisma.workflow.findMany({
    where: { enabled: true },
  });

  const payload = { ...data, _module: module, _event: event };
  const matching = workflows.filter((w) => {
    const t = w.trigger as TriggerPayload;
    return t?.type === 'module_event' && t?.module === module && t?.event === event;
  });

  for (const w of matching) {
    executeWorkflow(w.id, payload).catch((e) =>
      logger.error(`Workflow ${w.id} trigger error:`, e)
    );
  }
}
