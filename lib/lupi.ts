import { useCallback, useEffect, useState } from 'react';
import { browserStorage } from './lupi.storage';

type Listener<T> = (value: T) => void;
type Updater<T> = (prevState: T) => T;
type Unsubscribe = () => void;

interface StoreOptions {
  storageKey?: string;
}

class Store<T> {
  private state: T;
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
    // TODO: Add runtime validation here

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

  update(updater: Updater<T>): void {
    this.state = updater(this.state);
    this._persistState();
    this.listeners.forEach((callback) => callback(this.state));
  }

  getState(): T {
    return this.state;
  }

  reset(initialState: T): void {
    this.state = initialState;
    this._persistState();
    this.listeners.forEach((callback) => callback(this.state));
  }
}

export function createStore<T>(initialState: T, options?: StoreOptions) {
  return new Store<T>(initialState, options?.storageKey);
}

export function useStore<T>(store: Store<T>): [T, (updater: Updater<T>) => void] {
  const [value, setValue] = useState(store.getState());
  const stableSetValue = useCallback(setValue, []);

  useEffect(() => {
    const unsubscribe = store.subscribe(stableSetValue);
    return unsubscribe;
  }, [store, stableSetValue]);

  // TODO: set ser parcial

  return [
    value,
    // TODO: test performance of useCallback
    (updater) => store.update(updater),
  ];
}
