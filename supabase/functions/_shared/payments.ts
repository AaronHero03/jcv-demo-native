import Stripe from 'npm:stripe@23.2.0';
import { createClient } from 'npm:@supabase/supabase-js@2.119.2';

export function serverValue(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error('Falta la configuración de pagos del servidor.');
  return value;
}
export function stripeClient() {
  return new Stripe(serverValue('STRIPE_SECRET_KEY'), { httpClient: Stripe.createFetchHttpClient() });
}
export function paymentDatabase() {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  const key = (keys && JSON.parse(keys).default) || serverValue('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(serverValue('SUPABASE_URL'), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
};
export function json(status: number, body: Record<string, unknown>, headers?: HeadersInit) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
