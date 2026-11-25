const memoryStore = new Map<string, string>();
const unpersistedKeys = new Set<string>();
let lastStorageErrorName: string | null = null;

function getNativeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const storage = window.localStorage;
    if (
      !storage ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function'
    ) {
      return null;
    }
    return storage;
  } catch (err) {
    lastStorageErrorName =
      err instanceof Error ? err.name || 'SecurityError' : 'StorageError';
    return null;
  }
}

export function isLocalStorageAvailable(): boolean {
  const storage = getNativeLocalStorage();
  if (!storage) return false;
  const probeKey = '__neon_block_storage_probe__';
  try {
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return true;
  } catch (err) {
    lastStorageErrorName =
      err instanceof Error ? err.name || 'StorageError' : 'StorageError';
    return false;
  }
}

export function getStorageItem(key: string): string | null {
  if (unpersistedKeys.has(key) && memoryStore.has(key)) {
    return memoryStore.get(key) ?? null;
  }

  const storage = getNativeLocalStorage();
  if (!storage) {
    return memoryStore.get(key) ?? null;
  }

  try {
    const value = storage.getItem(key);
    if (value !== null) {
      memoryStore.set(key, value);
      return value;
    }
    return null;
  } catch (err) {
    lastStorageErrorName =
      err instanceof Error ? err.name || 'SecurityError' : 'StorageError';
    return memoryStore.get(key) ?? null;
  }
}

export function setStorageItem(key: string, value: string): boolean {
  const serialized = String(value);
  memoryStore.set(key, serialized);

  const storage = getNativeLocalStorage();
  if (!storage) {
    unpersistedKeys.add(key);
    return false;
  }

  try {
    storage.setItem(key, serialized);
    unpersistedKeys.delete(key);
    return true;
  } catch (err) {
    lastStorageErrorName =
      err instanceof Error ? err.name || 'QuotaExceededError' : 'StorageError';
    unpersistedKeys.add(key);
    return false;
  }
}

export function removeStorageItem(key: string): void {
  memoryStore.delete(key);
  unpersistedKeys.delete(key);

  const storage = getNativeLocalStorage();
  if (!storage) return;

  try {
    if (typeof storage.removeItem === 'function') {
      storage.removeItem(key);
    }
  } catch (err) {
    lastStorageErrorName =
      err instanceof Error ? err.name || 'SecurityError' : 'StorageError';
  }
}

export function clearMemoryStorageFallback(): void {
  memoryStore.clear();
  unpersistedKeys.clear();
  lastStorageErrorName = null;
}

export function getStorageDiagnostics(): {
  localStorageAvailable: boolean;
  fallbackKeysCount: number;
  lastErrorName: string | null;
} {
  return {
    localStorageAvailable: isLocalStorageAvailable(),
    fallbackKeysCount: memoryStore.size,
    lastErrorName: lastStorageErrorName,
  };
}
