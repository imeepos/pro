import { Observable, Subscription } from 'rxjs';

type Pull<T> = {
  resolve: (result: IteratorResult<T>) => void;
  reject: (error: unknown) => void;
};

export const observableToAsyncIterator = <T>(observable: Observable<T>): AsyncIterableIterator<T> => {
  const pushQueue: T[] = [];
  const pullQueue: Pull<T>[] = [];
  let isComplete = false;
  let error: unknown;
  let subscription: Subscription | null = null;

  const fulfillPullQueue = (result: IteratorResult<T>) => {
    while (pullQueue.length > 0) {
      const pull = pullQueue.shift();
      if (pull) {
        pull.resolve(result);
      }
    }
  };

  const rejectPullQueue = (err: unknown) => {
    while (pullQueue.length > 0) {
      const pull = pullQueue.shift();
      pull?.reject(err);
    }
  };

  const cleanup = () => {
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }
    pushQueue.length = 0;
    pullQueue.length = 0;
  };

  subscription = observable.subscribe({
    next(value) {
      if (pullQueue.length > 0) {
        const pull = pullQueue.shift();
        pull?.resolve({ value, done: false });
      } else {
        pushQueue.push(value);
      }
    },
    error(err) {
      error = err;
      rejectPullQueue(err);
      cleanup();
    },
    complete() {
      isComplete = true;
      fulfillPullQueue({ value: undefined, done: true });
      cleanup();
    },
  });

  const iterator: AsyncIterableIterator<T> = {
    async next(): Promise<IteratorResult<T>> {
      if (pushQueue.length > 0) {
        const value = pushQueue.shift() as T;
        return { value, done: false };
      }

      if (error) {
        return Promise.reject(error);
      }

      if (isComplete) {
        return { value: undefined, done: true };
      }

      return new Promise<IteratorResult<T>>((resolve, reject) => {
        pullQueue.push({ resolve, reject });
      });
    },
    async return(): Promise<IteratorResult<T>> {
      cleanup();
      isComplete = true;
      fulfillPullQueue({ value: undefined, done: true });
      return { value: undefined, done: true };
    },
    async throw(err?: unknown): Promise<IteratorResult<T>> {
      cleanup();
      rejectPullQueue(err);
      return Promise.reject(err);
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };

  return iterator;
};

export const asyncIteratorToObservable = <T>(iterator: AsyncIterator<T>): Observable<T> =>
  new Observable<T>((observer) => {
    let active = true;

    const pump = async () => {
      try {
        while (active) {
          const { value, done } = await iterator.next();
          if (done) {
            observer.complete();
            break;
          }
          observer.next(value as T);
        }
      } catch (error) {
        observer.error(error);
      }
    };

    pump();

    return () => {
      active = false;

      if (typeof iterator.return === 'function') {
        iterator.return(undefined).catch(() => undefined);
      }
    };
  });
