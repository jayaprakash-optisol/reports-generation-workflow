/**
 * Creates a singleton getter function that lazily initializes and caches an instance.
 * This ensures only one instance is created across the application.
 *
 * @example
 * const getService = createSingleton(() => new MyService());
 * const instance = getService(); // Creates instance on first call
 * const same = getService(); // Returns cached instance
 */
export function createSingleton<T>(factory: () => T): () => T {
  let instance: T | null = null;

  return (): T => {
    instance ??= factory();
    return instance;
  };
}

/**
 * Creates an async singleton getter function for services that require async initialization.
 *
 * @example
 * const getService = createAsyncSingleton(async () => {
 *   const service = new MyService();
 *   await service.initialize();
 *   return service;
 * });
 */
export function createAsyncSingleton<T>(factory: () => Promise<T>): () => Promise<T> {
  let instance: T | null = null;
  let initPromise: Promise<T> | null = null;

  return async (): Promise<T> => {
    if (instance) {
      return instance;
    }

    initPromise ??= factory().then(result => {
      instance = result;
      return result;
    });

    return initPromise;
  };
}
