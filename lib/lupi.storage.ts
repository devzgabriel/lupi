export type LocalStorageKey = string;

class Storage {
  get<T>(key: LocalStorageKey): T | null {
    if (!key || typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const savedState = localStorage.getItem(key);
      if (!savedState) return null;

      console.debug(`Loaded state from localStorage: ${key}`, savedState);

      // TODO: test type and parse
      if (savedState && savedState.startsWith('{')) {
        return JSON.parse(savedState) as T;
      }

      return savedState as unknown as T;
    } catch (error) {
      console.error(`Failed to get state from localStorage: ${key}`, error);
      return null;
    }
  }

  set<T>(key: LocalStorageKey, value: T) {
    if (!key || typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }

    try {
      if (typeof value === 'object') {
        localStorage.setItem(key, JSON.stringify(value));
        return;
      }

      localStorage.setItem(key, value as unknown as string);
    } catch (error) {
      console.error(`Failed to set state to localStorage: ${key}`, error);
    }
  }

  del(key: LocalStorageKey) {
    if (!key || typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to delete state from localStorage: ${key}`, error);
    }
  }
}

export const browserStorage = new Storage();
