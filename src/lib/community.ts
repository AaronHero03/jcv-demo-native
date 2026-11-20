import { forumTopics, newsItems, type ForumComment, type NewsItem } from '../data/community';
import { database, supabase } from './supabase';

export async function loadNews(): Promise<NewsItem[]> {
  if (!supabase) return newsItems;
  const { data, error } = await supabase.from('news').select('id,title,source,date:published_date,summary')
    .eq('is_published', true).order('updated_at', { ascending: false }).order('id');
  if (error) throw error;
  return data;
}

export interface Topic {
  id: string; title: string; body: string; author: string; createdAt: string;
}
const topicFields = 'id,title,body,author:author_label,createdAt:created_at';

export async function loadTopics(): Promise<Topic[]> {
  if (!supabase) return forumTopics;
  const { data, error } = await supabase.from('forum_topics').select(topicFields)
    .eq('is_published', true).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function loadThread(id: string): Promise<{ topic: Topic; replies: ForumComment[] } | null> {
  if (!supabase) {
    const topic = forumTopics.find(t => t.id === id);
    return topic ? { topic, replies: topic.initialReplies } : null;
  }
  const { data, error } = await supabase.from('forum_topics').select(
    'id,title,body,author:author_label,createdAt:created_at,replies:forum_replies(id,author:author_label,text:body,createdAt:created_at)')
    .eq('id', id).eq('is_published', true).eq('replies.is_published', true)
    .order('created_at', { referencedTable: 'replies', ascending: true }).maybeSingle();
  if (error) throw error;
  return data ? { topic: data, replies: data.replies } : null;
}

export async function postTopic(title: string, body: string) {
  const { data, error } = await database().rpc('nico_post_topic', { p_title: title.trim(), p_body: body.trim() });
  if (error) throw error;
  return String(data);
}

export async function postReply(topic: string, body: string) {
  const { error } = await database().rpc('nico_post_reply', { p_topic: topic, p_body: body.trim() });
  if (error) throw error;
}

export function displayDate(value: string) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? value : new Date(time).toLocaleDateString('es-MX');
}
