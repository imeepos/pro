import { StructuredLogger, StructuredLogPayload } from './logger';

describe('StructuredLogger', () => {
  let entries: StructuredLogPayload[];
  let debugSpy: jasmine.Spy;
  let infoSpy: jasmine.Spy;
  let warnSpy: jasmine.Spy;
  let errorSpy: jasmine.Spy;

  beforeEach(() => {
    entries = [];
    debugSpy = spyOn(console, 'debug').and.stub();
    infoSpy = spyOn(console, 'info').and.stub();
    warnSpy = spyOn(console, 'warn').and.stub();
    errorSpy = spyOn(console, 'error').and.stub();
  });

  it('emits structured payload with supplied context', () => {
    const logger = new StructuredLogger({
      service: 'test-service',
      level: 'debug',
      transport: payload => entries.push(payload)
    });

    logger.info('fetch screens', { query: 'screens' });

    expect(entries.length).toBe(1);
    const payload = entries[0];
    expect(payload.service).toBe('test-service');
    expect(payload.level).toBe('info');
    expect(payload.scope).toBeUndefined();
    expect(payload.message).toBe('fetch screens');
    expect(payload.msg).toBe('fetch screens');
    expect(payload.context).toEqual({ query: 'screens' });
    expect(infoSpy).toHaveBeenCalledWith('[test-service] fetch screens', { query: 'screens' });
  });

  it('merges inherited context when creating scoped logger', () => {
    const root = new StructuredLogger({
      service: 'test-service',
      level: 'debug',
      transport: payload => entries.push(payload)
    }).withContext({ requestId: 'rq-1' });

    const scoped = root.withScope('GraphqlGateway', { operation: 'ListScreens' });

    scoped.warn('retry', { attempt: 2 });

    expect(entries.length).toBe(1);
    const payload = entries[0];
    expect(payload.scope).toBe('GraphqlGateway');
    expect(payload.context).toEqual({
      requestId: 'rq-1',
      operation: 'ListScreens',
      attempt: 2
    });
    expect(warnSpy).toHaveBeenCalledWith('[test-service/GraphqlGateway] retry', {
      requestId: 'rq-1',
      operation: 'ListScreens',
      attempt: 2
    });
  });

  it('honours log level thresholds', () => {
    const logger = new StructuredLogger({
      service: 'test-service',
      level: 'error',
      transport: payload => entries.push(payload)
    });

    logger.warn('ignored warning');
    expect(entries.length).toBe(0);
    expect(warnSpy).not.toHaveBeenCalled();

    logger.error('captured error');
    expect(entries.length).toBe(1);
    expect(entries[0].level).toBe('error');
    expect(errorSpy).toHaveBeenCalledWith('[test-service] captured error');
  });

  it('serialises Error instances into context metadata', () => {
    const logger = new StructuredLogger({
      service: 'test-service',
      level: 'debug',
      transport: payload => entries.push(payload)
    });

    const problem = new Error('network failure');
    logger.debug('trace', problem);

    expect(entries.length).toBe(1);
    const payload = entries[0];
    expect(payload.level).toBe('debug');
    expect(payload.context).toEqual({
      name: 'Error',
      message: 'network failure',
      stack: problem.stack
    });
    expect(debugSpy).toHaveBeenCalledWith('[test-service] trace', {
      name: 'Error',
      message: 'network failure',
      stack: problem.stack
    });
  });
});
