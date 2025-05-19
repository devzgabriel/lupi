import { useCallback, useEffect, useMemo, useState } from 'react';
import { LupiStorage } from './storage';

// Types: Rendering
type Listener<T> = (value: T) => void;
type Unsubscribe = () => void;

// Types: Update
type Updater<T> = (prevState: T) => T;
type CopyWith<T> = (updater: Updater<T> | Partial<T>) => void;

// Types: Validate
type ValidatorFn<T> = (state: T) => string[];

// Types: Actions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExternalActionParams = any[];
type InternalActionFn<T> = (state: T, ...args: ExternalActionParams) => Promise<T> | T;
type ActionsDeclaration<T> = Record<string, InternalActionFn<T>>;
type ActionFn = (...args: ExternalActionParams) => void;

type StoreConstructorProps<T, A extends ActionsDeclaration<T>> = {
  storage: LupiStorage;
  storageKey?: string | undefined;
  actions?: A | undefined;
};

class Store<T, A extends ActionsDeclaration<T>> {
  private initialState: T;
  private state: T;
  actions?: A;
  private listeners: Set<Listener<T>>;
  private storageKey?: string | undefined;
  private storage: LupiStorage;
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private debounceDelayInMs = 300;

  constructor(initialState: T, { storage, storageKey, actions }: StoreConstructorProps<T, A>) {
    this.storage = storage;
    this.storageKey = storageKey;
    this.initialState = initialState;
    this.state = initialState;
    this.actions = actions ?? ({} as A);

    this._loadState(initialState).then((state) => {
      this.state = state;
      this.listeners.forEach((callback) => callback(this.state));
    });

    this.listeners = new Set();
  }

  private async _loadState(initialState: T): Promise<T> {
    if (!this.storageKey) return initialState;
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
  getState(): T {
    return this.state;
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

  async reset(): Promise<void> {
    this.state = this.initialState;
    await this._persistState();
    this.listeners.forEach((callback) => callback(this.state));
  }

  async dispatch<K extends keyof A>(
    actionName: K,
    ...args: Parameters<A[K]> extends [T, ...infer P] ? P : never
  ): Promise<void> {
    if (this.actions && this.actions[actionName]) {
      this.state = await this.actions[actionName](this.state, ...args);
      await this._persistState();
      this.listeners.forEach((callback) => callback(this.state));
    } else {
      console.debug(`Action "${String(actionName)}" not found`);
    }
  }
}

type StoreHookOutput<T, A extends Record<string, ActionFn>> = {
  state: T;
  copyWith: CopyWith<T>;
  reset: () => void;
  actions: {
    [K in keyof A]: (...args: Parameters<A[K]> extends [T, ...infer P] ? P : never) => void;
  };
};

/**
 * Custom hook to manage and subscribe to a store's state.
 *
 * @template T - The type of the state managed by the store.
 * @param {Store<T, A>} store - The store instance to subscribe to.
 * @returns {StoreHookOutput<T, A>} An object containing the current state value, a function to update the state, and the actions.
 *
 * @example
 * const { state: products, copyWith, actions } = useStore(store);
 *
 * @remarks
 * The hook subscribes to the store and updates the component state whenever the store's state changes.
 * The updater function can either be a partial state object or a function that receives the current state and returns a new state.
 */
function useStore<T, A extends Record<string, InternalActionFn<T>>>(
  store: Store<T, A>,
): StoreHookOutput<T, A> {
  const [value, setValue] = useState(store.getState());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSetValue = useCallback(setValue, []);

  useEffect(() => {
    const unsubscribe = store.subscribe(stableSetValue);
    return unsubscribe;
  }, [store, stableSetValue]);

  const actions = useMemo(() => {
    const externalActions: {
      [K in keyof A]: (...args: Parameters<A[K]> extends [T, ...infer P] ? P : never) => void;
    } = {} as {
      [K in keyof A]: (...args: Parameters<A[K]> extends [T, ...infer P] ? P : never) => void;
    };
    if (store.actions) {
      for (const actionName in store.actions) {
        externalActions[actionName] = (
          ...args: Parameters<A[typeof actionName]> extends [T, ...infer P] ? P : never
        ) => {
          store.dispatch(actionName, ...args);
        };
      }
    }
    return externalActions;
  }, [store]);

  return {
    state: value,
    copyWith: (updater) =>
      typeof updater === 'function'
        ? store.update(updater as Updater<T>)
        : store.set(updater as Partial<T>),
    reset: store.reset,
    actions,
  };
}

type CreateStoreOptions<T, A extends ActionsDeclaration<T>> = {
  storageKey?: string | undefined;
  actions?: A | undefined;
  encryptKey?: string;
  validators?: ValidatorFn<T>[];
};

/**
 * Creates a store with the given initial state and options and return a hook to access the store.
 *
 * The store will persist its state to the browser's local storage if a storage key is provided.
 *
 * The store will also validate its state using the provided validators.
 *
 * @template T - The type of the state.
 * @param {T} initialState - The initial state of the store.
 * @param {CreateStoreOptions<T, A>} [options] - Optional configuration for the store.
 * @returns {() => StoreHookOutput<T, A>} A function that returns the store hook output.
 */
export function createStore<T, A extends ActionsDeclaration<T>>(
  initialState: T,
  options?: CreateStoreOptions<T, A>,
): () => StoreHookOutput<T, A> {
  const storage = new LupiStorage(options?.encryptKey);
  const store = new Store<T, A>(initialState, {
    storage,
    storageKey: options?.storageKey,
    actions: options?.actions,
  });
  return () => useStore(store);
}
