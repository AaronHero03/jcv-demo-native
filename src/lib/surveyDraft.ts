import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SurveyAnswers } from '../data/surveys';
import { decryptDraft, encryptDraft } from './draftCipher';

interface Draft { step: number; answers: SurveyAnswers }
let pending: Promise<unknown> = Promise.resolve();
// Un envío confirmado borra el borrador después de cualquier escritura en curso.
function inOrder<T>(work: () => Promise<T>) {
  const result = pending.then(work);
  pending = result.catch(() => undefined);
  return result;
}

export function draftKey(userId: string, surveyId: string) {
  return 'jcv.draft.v1:' + encodeURIComponent(userId) + ':' + encodeURIComponent(surveyId);
}
export function saveDraft(key: string, value: Draft) {
  return inOrder(async () => AsyncStorage.setItem(key, await encryptDraft(JSON.stringify(value), key)));
}
export function readDraft(key: string): Promise<Draft | null> {
  return inOrder(async () => {
    const blob = await AsyncStorage.getItem(key);
    if (!blob) return null;
    const value = JSON.parse(await decryptDraft(blob, key));
    if (!Number.isInteger(value.step) || !value.answers || typeof value.answers !== 'object' ||
        Array.isArray(value.answers) || !Object.values(value.answers).every(x => typeof x === 'string')) {
      throw new Error('Borrador ilegible.');
    }
    return value;
  });
}
export function clearDraft(key: string) {
  return inOrder(() => AsyncStorage.removeItem(key));
}
