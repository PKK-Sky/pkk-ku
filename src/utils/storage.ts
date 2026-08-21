/**
 * Utility untuk local storage / AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEY = '@pkk:report_draft';
const SUBMISSION_KEY = '@pkk:submission_state';

export async function saveDraft<T>(draft: T): Promise<void> {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export async function getDraft<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_KEY);
}

export async function saveSubmissionState(state: unknown): Promise<void> {
  await AsyncStorage.setItem(SUBMISSION_KEY, JSON.stringify(state));
}

export async function getSubmissionState<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(SUBMISSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearSubmissionState(): Promise<void> {
  await AsyncStorage.removeItem(SUBMISSION_KEY);
}
