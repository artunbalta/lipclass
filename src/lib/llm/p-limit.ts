// Minimal concurrency limiter (no deps).
// Used to cap parallel lipsync jobs so we don't blow past VEED's rate limit.
//
// Usage:
//   const limit = pLimit(4);
//   const results = await Promise.all(items.map((it) => limit(() => doWork(it))));

export function pLimit(concurrency: number) {
  if (concurrency < 1) throw new Error('concurrency must be >= 1');

  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    active--;
    const fn = queue.shift();
    if (fn) fn();
  };

  return function <T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        task().then(
          (value) => { resolve(value); next(); },
          (err)   => { reject(err);   next(); },
        );
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
  };
}
