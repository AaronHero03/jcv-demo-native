import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

async function keyForDrafts() {
  const name = 'jcv.survey.draft-key.v1';
  const saved = await SecureStore.getItemAsync(name);
  if (saved) return AESEncryptionKey.import(saved, 'base64');
  const key = await AESEncryptionKey.generate();
  await SecureStore.setItemAsync(name, await key.encoded('base64'), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

export async function encryptDraft(text: string, scope: string): Promise<string> {
  const sealed = await aesEncryptAsync(new TextEncoder().encode(text), await keyForDrafts(),
    { additionalData: new TextEncoder().encode(scope) });
  return sealed.combined('base64');
}

export async function decryptDraft(cipher: string, scope: string): Promise<string> {
  const plain = await aesDecryptAsync(AESSealedData.fromCombined(cipher), await keyForDrafts(),
    { additionalData: new TextEncoder().encode(scope) });
  return new TextDecoder().decode(plain);
}
