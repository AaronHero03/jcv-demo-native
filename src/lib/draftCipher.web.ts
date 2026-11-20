// IndexedDB puede guardar una CryptoKey no exportable con structured clone.
function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error);
  });
}

async function keyForDrafts(): Promise<CryptoKey> {
  const open = indexedDB.open('jcv-draft-keys', 1);
  open.onupgradeneeded = () => open.result.createObjectStore('keys');
  const db = await request(open);
  try {
    const existing: CryptoKey | undefined = await request(db.transaction('keys').objectStore('keys').get('v1'));
    if (existing) return existing;
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt','decrypt']);
    // La transacción serializa la primera apertura simultánea desde dos pestañas.
    const tx = db.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');
    const current = await request(store.get('v1'));
    if (current) return current;
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
    });
    store.put(key, 'v1');
    await done;
    return key;
  } finally { db.close(); }
}

export async function encryptDraft(text: string, scope: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(scope) },
    await keyForDrafts(), new TextEncoder().encode(text));
  const packed = new Uint8Array(iv.length + bytes.byteLength);
  packed.set(iv); packed.set(new Uint8Array(bytes), iv.length);
  return btoa(Array.from(packed, n => String.fromCharCode(n)).join(''));
}

export async function decryptDraft(cipher: string, scope: string): Promise<string> {
  const packed = Uint8Array.from(atob(cipher), c => c.charCodeAt(0));
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: packed.slice(0, 12),
    additionalData: new TextEncoder().encode(scope) }, await keyForDrafts(), packed.slice(12));
  return new TextDecoder().decode(bytes);
}
