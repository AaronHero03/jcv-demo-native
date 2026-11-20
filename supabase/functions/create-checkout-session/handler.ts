import { cors, json, paymentDatabase, serverValue, stripeClient } from '../_shared/payments.ts';

export async function checkout(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method === 'GET' && new URL(request.url).searchParams.get('regreso') === '1') {
    return new Response('Ya puedes cerrar el navegador. Consulta el estado del donativo en la app de Jalisco Cómo Vamos.',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
  if (request.method !== 'POST') return json(405, { error: 'Usa POST.' }, cors);
  const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return json(401, { error: 'Inicia sesión.' }, cors);
  const body = await request.json().catch(() => null);
  const amount = body?.amount_mxn;
  const requestId = body?.request_id;
  if (!Number.isSafeInteger(amount) || amount < 10 || amount > 999999 || typeof requestId !== 'string' ||
      !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(requestId)) {
    return json(400, { error: 'Solicitud o monto inválido.' }, cors);
  }
  try {
    const db = paymentDatabase();
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return json(401, { error: 'La sesión ya no es válida.' }, cors);
    const userId = data.user.id;
    const returnUrl = serverValue('SUPABASE_URL') + '/functions/v1/create-checkout-session?regreso=1';
    const session = await stripeClient().checkout.sessions.create({
      mode: 'payment', client_reference_id: userId,
      metadata: { app: 'jcv-donations' }, success_url: returnUrl, cancel_url: returnUrl,
      line_items: [{ quantity: 1, price_data: {
        currency: 'mxn', unit_amount: amount * 100, product_data: { name: 'Donativo a Jalisco Cómo Vamos' },
      } }],
    }, { idempotencyKey: 'jcv:' + userId + ':' + requestId });
    if (!session.url) return json(503, { error: 'Stripe no devolvió una sesión de pago.' }, cors);
    const write = await db.from('donations').upsert({
      user_id: userId, amount_mxn: amount, stripe_session_id: session.id, status: 'pending',
    }, { onConflict: 'stripe_session_id', ignoreDuplicates: true });
    if (write.error) return json(503, { error: 'Reintenta para registrar la sesión de pago.' }, cors);
    return json(200, { url: session.url }, cors);
  } catch { return json(503, { error: 'No se pudo iniciar el pago. Vuelve a intentarlo.' }, cors); }
}
