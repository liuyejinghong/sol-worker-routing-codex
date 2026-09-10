import { setTimeout } from 'node:timers/promises';

export async function awaitTask<T extends { finished: boolean; state: string }>(
  lookup: () => Promise<T>, seconds: number, signal?: AbortSignal,
): Promise<T & { wait_expired: boolean }> {
  const deadline = Date.now() + seconds * 1000;
  while (true) {
    signal?.throwIfAborted();
    const task = await lookup();
    if (task.finished || task.state === 'unknown') return { ...task, wait_expired: false };
    if (Date.now() >= deadline) return { ...task, wait_expired: true };
    await setTimeout(Math.min(500, Math.max(1, deadline - Date.now())), undefined, { signal });
  }
}
