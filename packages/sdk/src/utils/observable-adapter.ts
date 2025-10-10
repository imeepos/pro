import { Observable } from 'rxjs';

/**
 * 将 Promise 转换为 Observable 的适配器
 */
export function fromPromise<T>(promise: Promise<T>): Observable<T> {
  return new Observable<T>((subscriber) => {
    promise
      .then((result) => {
        subscriber.next(result);
        subscriber.complete();
      })
      .catch((error) => {
        subscriber.error(error);
      });
  });
}