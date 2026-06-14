import axios from 'axios';

const QUEUE_KEY = 'rm-offline-queue';

interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  body: unknown;
  timestamp: number;
}

function readQueue(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedRequest[];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedRequest[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueRequest(method: string, url: string, body: unknown): void {
  const queue = readQueue();
  queue.push({ id: crypto.randomUUID(), method, url, body, timestamp: Date.now() });
  writeQueue(queue);
}

export function getQueueLength(): number {
  return readQueue().length;
}

export async function drainQueue(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;

  const failed: QueuedRequest[] = [];
  for (const req of queue) {
    try {
      await axios({ method: req.method, url: req.url, data: req.body });
    } catch {
      failed.push(req);
    }
  }
  writeQueue(failed);
}
