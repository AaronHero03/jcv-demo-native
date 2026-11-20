import Stripe from 'npm:stripe@23.2.0';
import { json, paymentDatabase, serverValue, stripeClient } from '../_shared/payments.ts';

export async function webhook(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'Usa POST.' });
  const signature = request.headers.get('Stripe-Signature');
  if (!signature) return json(400, { error: 'Falta la firma.' });
  try {
    const stripe = stripeClient();
    const secret = serverValue('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;
    const raw = await request.text();
    try {
      event = await stripe.webhooks.constructEventAsync(raw, signature, secret, undefined,
        Stripe.createSubtleCryptoProvider());
    } catch { return json(400, { error: 'Firma inválida.' }); }

    let nextStatus: 'failed' | 'succeeded';
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        if (event.data.object.payment_status !== 'paid') return json(200, { received: true });
        nextStatus = 'succeeded'; break;
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        nextStatus = 'failed'; break;
      default: return json(200, { received: true });
    }
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.app !== 'jcv-donations' || session.mode !== 'payment') return json(200, { received: true });
    const db = paymentDatabase();
    const { data: row, error } = await db.from('donations').select('id,user_id,amount_mxn,status')
      .eq('stripe_session_id', session.id).maybeSingle();
    // Un webhook puede llegar antes de que termine la inserción de checkout.
    if (error || !row) return json(503, { error: 'Registro aún no disponible.' });
    if (session.client_reference_id !== row.user_id || session.currency !== 'mxn' || session.amount_total !== row.amount_mxn * 100) {
      return json(400, { error: 'El donativo no coincide con la sesión.' });
    }
    // El filtro en el UPDATE también protege frente a entregas concurrentes y fuera de orden.
    const write = await db.from('donations').update({ status: nextStatus }).eq('id', row.id)
      .in('status', nextStatus === 'succeeded' ? ['pending','failed'] : ['pending']);
    if (write.error) return json(503, { error: 'Reintentar actualización.' });
    return json(200, { received: true });
  } catch { return json(503, { error: 'Servicio temporalmente no disponible.' }); }
}
