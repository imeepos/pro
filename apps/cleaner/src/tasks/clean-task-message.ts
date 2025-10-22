import { RawDataReadyEvent } from '@pro/types';

export interface CleanTaskMessage extends RawDataReadyEvent {
  retryCount?: number;
}

export const fromRawDataEvent = (event: RawDataReadyEvent): CleanTaskMessage => ({
  ...event,
});
