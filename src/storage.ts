type LocalStorageKey = string;

export class LupiStorage {
  private encryptKey?: string | undefined;
  private cachedKey?: CryptoKey;

  constructor(encryptKey?: string) {
    this.encryptKey = encryptKey;
  }

  private async getKey() {
    if (this.cachedKey) return this.cachedKey;
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(this.encryptKey),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );
    this.cachedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode('salt'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
    return this.cachedKey;
  }

  async encrypt(value: string): Promise<string> {
    const key = await this.getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(value);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    const buffer = new Uint8Array(encrypted);
    const ivAndBuffer = new Uint8Array(iv.length + buffer.length);
    ivAndBuffer.set(iv);
    ivAndBuffer.set(buffer, iv.length);
    return btoa(String.fromCharCode(...ivAndBuffer));
  }

  async decrypt(value: string): Promise<string> {
    const key = await this.getKey();
    const ivAndBuffer = new Uint8Array(
      atob(value)
        .split('')
        .map((char) => char.charCodeAt(0)),
    );
    const iv = ivAndBuffer.slice(0, 12);
    const buffer = ivAndBuffer.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, buffer);
    return new TextDecoder().decode(decrypted);
  }

  async get<T>(key: LocalStorageKey): Promise<T | null> {
    if (!key || typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const savedState = localStorage.getItem(key);
      if (!savedState) return null;

      console.debug(`Loaded state from localStorage: ${key}`, savedState);

      const decrypted = this.encryptKey ? await this.decrypt(savedState) : savedState;

      let parsedValue: unknown;
      const { type, value } = JSON.parse(decrypted);
      switch (type) {
        case 'number':
          parsedValue = Number(value);
          break;
        case 'boolean':
          parsedValue = value === 'true';
          break;
        case 'object':
        case 'array':
          parsedValue = JSON.parse(value);
          break;
        default:
          parsedValue = value;
      }

      return parsedValue as T;
    } catch (error) {
      console.error(`Failed to get state from localStorage: ${key}`, error);
      return null;
    }
  }

  async set<T>(key: LocalStorageKey, value: T): Promise<void> {
    if (!key || typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      let stringifiedValue: string;
      let type: string;

      if (typeof value === 'object' || Array.isArray(value)) {
        stringifiedValue = JSON.stringify(value);
        type = Array.isArray(value) ? 'array' : 'object';
      } else {
        stringifiedValue = String(value);
        type = typeof value;
      }

      const dataToStore = JSON.stringify({ type, value: stringifiedValue });
      const encrypted = this.encryptKey ? await this.encrypt(dataToStore) : dataToStore;
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error(`Failed to set state to localStorage: ${key}`, error);
    }
  }

  del(key: LocalStorageKey): void {
    if (!key || typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to delete state from localStorage: ${key}`, error);
    }
  }
}
