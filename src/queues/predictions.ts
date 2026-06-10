/**
 * Очередь BullMQ для еженедельных прогнозов (при наличии Redis)
 */

import { Queue, Worker } from 'bullmq';
import { sendWeeklyPredictions } from '../modules/predict/cron';
import { logger } from '../utils/logger';

const QUEUE_NAME = 'predictions';

function getConnection(): { host: string; port: number; password?: string } | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: parseInt(u.port || '6379', 10),
      password: u.password || undefined,
    };
  } catch {
    return null;
  }
}

let queue: Queue | null = null;
let worker: Worker | null = null;

export function getPredictionsQueue(): Queue | null {
  if (queue) return queue;
  const conn = getConnection();
  if (!conn) return null;
  queue = new Queue(QUEUE_NAME, { connection: conn });
  return queue;
}

export function startPredictionsWorker(): void {
  const conn = getConnection();
  if (!conn) return;
  worker = new Worker(
    QUEUE_NAME,
    async () => {
      await sendWeeklyPredictions();
    },
    { connection: conn }
  );
  worker.on('completed', () => logger.debug('Predictions job completed'));
  worker.on('failed', (_, err) => logger.error('Predictions job failed', err));
  logger.info('Predictions worker started');
}

export async function addPredictionsJob(): Promise<void> {
  const q = getPredictionsQueue();
  if (!q) return;
  await q.add('weekly', {}, { jobId: 'weekly-' + Date.now() });
  logger.debug('Predictions job added');
}

export async function closePredictionsQueue(): Promise<void> {
  if (worker) await worker.close();
  if (queue) await queue.close();
  worker = null;
  queue = null;
}
