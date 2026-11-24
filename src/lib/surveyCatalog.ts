import AsyncStorage from '@react-native-async-storage/async-storage';
import { surveys, type Survey, type SurveyQuestion, type SurveyAnswers } from '../data/surveys';
import { decryptDraft, encryptDraft } from './draftCipher';
import { database, supabase } from './supabase';

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string' && v.length > 0);
}

function readQuestion(row: { id: string; prompt: string; options: unknown }): SurveyQuestion {
  const { id, prompt, options } = row;
  if (strings(options)) return { id, prompt, type: 'single', options };
  if (options && typeof options === 'object' && !Array.isArray(options)) {
    const q = options as Partial<SurveyQuestion>;
    if (q.type === 'single' && strings(q.options)) return { ...q, id, prompt, type: 'single', options: q.options };
    if ((q.type === 'grid' || q.type === 'multi') && Array.isArray(q.items) && q.items.length &&
        q.items.every(i => i && typeof i.id === 'string' && typeof i.label === 'string')) {
      if (q.type === 'grid' && strings(q.scale)) return { ...q, id, prompt, type: 'grid', items: q.items, scale: q.scale };
      if (q.type === 'multi') return { ...q, id, prompt, type: 'multi', items: q.items, noneLabel: q.noneLabel || 'Ninguna' };
    }
  }
  throw new Error('No se pudieron leer las opciones de una pregunta. Actualiza el cuestionario.');
}

export async function loadSurveys(): Promise<Survey[]> {
  if (!supabase) return surveys;
  const cacheKey = 'jcv.surveys.v1:' + process.env.EXPO_PUBLIC_SUPABASE_URL;
  const { data, error, status } = await supabase.from('surveys')
    .select('id,title,description,questions:survey_questions(id,prompt,options,sort_order)')
    .eq('is_active', true).order('sort_order', { referencedTable: 'questions' }).order('id', { referencedTable: 'questions' })
    .order('created_at', { ascending: false });
  if (error) {
    if (status === 0) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) return JSON.parse(await decryptDraft(cached, cacheKey)) as Survey[];
    }
    throw error;
  }
  const catalog = data.map(row => {
    const original = surveys.find(s => s.id === row.id);
    return { id: row.id, title: row.title, description: row.description || '',
      period: original?.period || 'Encuesta Tec', estimatedMinutes: original?.estimatedMinutes || 0,
      questions: row.questions.map(readQuestion) };
  });
  // Solo guarda el catálogo público cifrado con AES-GCM. El servidor vuelve a comprobar su vigencia al enviar.
  await AsyncStorage.setItem(cacheKey, await encryptDraft(JSON.stringify(catalog), cacheKey)).catch(() => undefined);
  return catalog;
}

export async function loadCompletions(userId: string): Promise<string[]> {
  const { data, error } = await database().from('survey_submissions').select('survey_id').eq('user_id', userId);
  if (error) throw error;
  return data.map(r => r.survey_id);
}

export async function sendSurvey(id: string, answers: SurveyAnswers) {
  const { error } = await database().rpc('nico_submit_survey', { p_survey: id, p_answers: answers });
  if (error) throw error;
}
