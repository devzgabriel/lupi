import { useCallback, useEffect, useState } from 'react';
import { LupiStorage } from './storage';

type Listener<T> = (value: T) => void;
type Updater<T> = (prevState: T) => T;
type SetState<T> = (updater: Updater<T> | Partial<T>) => void;
type Unsubscribe = () => void;
type ValidatorFn<T> = (state: T) => string[];

interface StoreOptions<T> {
  storageKey?: string;
  encryptKey?: string;
  validators?: ValidatorFn<T>[];
}

interface StoreOptionsProps {
  storageKey?: string | undefined;
  storage: LupiStorage;
}

class Store<T> {
  private state: T;
  private listeners: Set<Listener<T>>;
  private storageKey?: string | undefined;
  private storage: LupiStorage;
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private debounceDelayInMs = 300;

  constructor(initialState: T, { storage, storageKey }: StoreOptionsProps) {
    this.storage = storage;
    this.storageKey = storageKey;
    this.state = initialState;

    this._loadState(initialState).then((state) => {
      this.state = state;
      this.listeners.forEach((callback) => callback(this.state));
    });

    this.listeners = new Set();
  }

  private async _loadState(initialState: T): Promise<T> {
    if (!this.storageKey) return initialState;
    console.log('Loading state from storage:', this.storage);
    if (!this.storage) {
      console.error('No storage instance available');
      return initialState;
    }
    const savedState = await this.storage.get<T>(this.storageKey);
    // TODO: Add runtime validation here

    return savedState ?? initialState;
  }

  private async _persistState(): Promise<void> {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.debounceTimeout = setTimeout(async () => {
      if (this.storageKey) {
        await this.storage.set(this.storageKey, this.state);
      }
    }, this.debounceDelayInMs);
  }

  subscribe(callback: Listener<T>): Unsubscribe {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async update(updater: Updater<T>): Promise<void> {
    this.state = updater(this.state);
    await this._persistState();
    this.listeners.forEach((callback) => callback(this.state));
  }

  async set(newState: Partial<T>): Promise<void> {
    this.state = { ...this.state, ...newState };
    await this._persistState();
    this.listeners.forEach((callback) => callback(this.state));
  }

  getState(): T {
    return this.state;
  }

  async reset(initialState: T): Promise<void> {
    this.state = initialState;
    await this._persistState();
    this.listeners.forEach((callback) => callback(this.state));
  }
}

type StoreHookOutput<T> = [T, SetState<T>];

/**
 * Custom hook to manage and subscribe to a store's state.
 *
 * @template T - The type of the state managed by the store.
 * @param {Store<T>} store - The store instance to subscribe to.
 * @returns {StoreHookOutput<T>} A tuple containing the current state value and a function to update the state.
 *
 * @example
 * const [state, setState] = useStore(myStore);
 *
 * @remarks
 * The hook subscribes to the store and updates the component state whenever the store's state changes.
 * The updater function can either be a partial state object or a function that receives the current state and returns a new state.
 */
function useStore<T>(store: Store<T>): StoreHookOutput<T> {
  const [value, setValue] = useState(store.getState());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSetValue = useCallback(setValue, []);

  useEffect(() => {
    const unsubscribe = store.subscribe(stableSetValue);
    return unsubscribe;
  }, [store, stableSetValue]);

  return [
    value,
    // TODO: test performance of useCallback
    (updater) => {
      if (typeof updater === 'function') {
        store.update(updater as Updater<T>);
      } else {
        store.set(updater as Partial<T>);
      }
    },
  ];
}

/**
 * Creates a store with the given initial state and options and return a hook to access the store.
 *
 * The store will persist its state to the browser's local storage if a storage key is provided.
 *
 * The store will also validate its state using the provided validators.
 *
 * @template T - The type of the state.
 * @param {T} initialState - The initial state of the store.
 * @param {StoreOptions<T>} [options] - Optional configuration for the store.
 * @returns {() => StoreHookOutput<T>} A function that returns the store hook output.
 */
export function createStore<T>(
  initialState: T,
  options?: StoreOptions<T>,
): () => StoreHookOutput<T> {
  const storage = new LupiStorage(options?.encryptKey);
  const store = new Store<T>(initialState, {
    storage,
    storageKey: options?.storageKey,
  });
  return () => useStore(store);
}
