export function throttleFrame<T extends (...args: any[]) => void>(fn: T): T {
  let rafId: number | null = null;

  return ((...args: any[]) => {
    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      fn(...args);
      rafId = null;
    });
  }) as T;
}

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T {
  let timeoutId: number;

  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), delay);
  }) as T;
}
