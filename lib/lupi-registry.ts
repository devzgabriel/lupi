import { useCallback, useEffect, useState } from 'react';
import { browserStorage } from './lupi.storage';

type Listener<T> = (value: T | undefined) => void;
type Updater<T> = (prevState: T | undefined) => T;
type Unsubscribe = () => void;

interface StoreOptions {
  storageKey?: string;
}

class Store<T> {
  private state: T | undefined;
  private listeners: Set<Listener<T>>;
  private storageKey?: string;
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private debounceDelayInMs = 300;

  constructor(initialState: T, storageKey?: string) {
    this.storageKey = storageKey;
    this.state = this._loadState(initialState);
    this.listeners = new Set();
  }

  private _loadState(initialState: T): T {
    if (!this.storageKey) return initialState;
    const savedState = browserStorage.get<T>(this.storageKey);
    return savedState ?? initialState;
  }

  private _persistState(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.debounceTimeout = setTimeout(() => {
      if (this.storageKey) {
        browserStorage.set(this.storageKey, JSON.stringify(this.state));
      }
    }, this.debounceDelayInMs);
  }

  subscribe(callback: Listener<T>): Unsubscribe {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  update(updater: Updater<T | undefined>): void {
    this.state = updater(this.state);
    this._persistState();
    this.listeners.forEach((callback) => callback(this.state));
  }

  getState(): T | undefined {
    return this.state;
  }

  reset(initialState: T): void {
    this.state = initialState;
    this._persistState();
    this.listeners.forEach((callback) => callback(this.state));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storeRegistry = new Map<string, Store<any>>();

export function createStore<T>(key: string, initialState: T, options?: StoreOptions): Store<T> {
  if (!storeRegistry.has(key)) {
    storeRegistry.set(key, new Store<T>(initialState, options?.storageKey));
  }
  return storeRegistry.get(key) as Store<T>;
}

// `useStore` infers type from `storeRegistry` or uses `initialState`
export function useStore<T>(
  key: string,
): [T | undefined, (updater: Updater<T | undefined>) => void];
export function useStore<T>(key: string, initialState: T): [T, (updater: Updater<T>) => void];

export function useStore<T>(key: string, initialState?: T) {
  const existingStore = storeRegistry.get(key);

  if (!existingStore && initialState === undefined) {
    throw new Error(
      `Store with key "${key}" does not exist. Provide an initial state when using useStore for the first time.`,
    );
  }

  const store = existingStore ?? createStore<T>(key, initialState as T);
  const [value, setValue] = useState<T | undefined>(store.getState());
  const stableSetValue = useCallback(setValue, []);

  useEffect(() => {
    const unsubscribe = store.subscribe(stableSetValue);
    return unsubscribe;
  }, [store, stableSetValue]);

  return [value, (updater: Updater<T | undefined>) => store.update(updater)];
}
