import assert from 'node:assert/strict';
import { checkout } from './create-checkout-session/handler.ts';
import { webhook } from './stripe-webhook/handler.ts';
import { stripeClient } from './_shared/payments.ts';

const user = '64c7c497-01cb-4ec6-93e3-f36eb0f8633b';
const key = '6814db90-90fe-4cc4-8a98-986395c77bcc';
const signing = 'whsec_local_fixture';
const stripeSession = { id: 'cs_fixture', url: 'https://checkout.stripe.com/c/pay/cs_fixture',
  metadata: { app: 'jcv-donations' }, mode: 'payment', currency: 'mxn',
  amount_total: 5000, payment_status: 'paid', client_reference_id: user };

function requestCheckout(body: unknown, token = 'local-test-token') {
  return new Request('https://fixture.invalid/create-checkout-session', { method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

async function event(type: string, values = {}, goodSignature = true) {
  const payload = JSON.stringify({ id: 'evt_fixture', object: 'event', type, data: { object: { ...stripeSession, ...values } } });
  const signature = await stripeClient().webhooks.generateTestHeaderStringAsync({
    payload, secret: goodSignature ? signing : 'whsec_wrong_fixture',
  });
  return new Request('https://fixture.invalid/stripe-webhook', { method: 'POST',
    headers: { 'Stripe-Signature': signature }, body: payload });
}

Deno.test('Checkout y webhook con Stripe SDK, firma real y servicios HTTP simulados', async t => {
  const env = { SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'local-service-fixture',
    STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: signing };
  for (const [k,v] of Object.entries(env)) Deno.env.set(k,v);
  const original = globalThis.fetch;
  let donation: Record<string, unknown> | undefined;
  let failNextInsert = true;
  const idempotencyKeys: string[] = [];
  let writes = 0;

  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    if (url.hostname === 'fixture.invalid' && url.pathname === '/auth/v1/user') {
      if (req.headers.get('Authorization') !== 'Bearer local-test-token') return Response.json({message:'invalid'},{status:401});
      return Response.json({ id:user, aud:'authenticated', created_at:'2026-01-01', email:'fixture@example.org' });
    }
    if (url.hostname === 'api.stripe.com' && url.pathname === '/v1/checkout/sessions') {
      idempotencyKeys.push(req.headers.get('Idempotency-Key') || '');
      const form = new URLSearchParams(await req.text());
      assert.equal(form.get('line_items[0][price_data][unit_amount]'),'5000');
      assert.equal(form.get('client_reference_id'),user);
      return Response.json(stripeSession);
    }
    if (url.hostname === 'fixture.invalid' && url.pathname === '/rest/v1/donations') {
      if (req.method === 'POST') {
        if (failNextInsert) { failNextInsert=false; return Response.json({message:'write failed'},{status:409}); }
        const data = await req.json();
        assert.match(req.headers.get('Prefer') || '',/ignore-duplicates/);
        donation ??= { id:'donation-fixture',...data };
        return new Response(null,{status:201});
      }
      if (req.method === 'GET') return Response.json(donation ? [donation] : []);
      if (req.method === 'PATCH') {
        assert.equal(url.searchParams.get('id'),'eq.donation-fixture');
        const allowed = url.searchParams.get('status') || '';
        if (donation && allowed.includes(String(donation.status))) {
          donation.status=(await req.json()).status; writes++;
        }
        return new Response(null,{status:204});
      }
    }
    throw new Error('Solicitud inesperada en la prueba: ' + url.pathname);
  };

  try {
    await t.step('identidad y monto se validan antes de crear una sesión', async () => {
      assert.equal((await checkout(requestCheckout({amount_mxn:0,request_id:key}))).status,400);
      assert.equal((await checkout(requestCheckout({amount_mxn:50,request_id:key},'expired'))).status,401);
      assert.equal(idempotencyKeys.length,0);
    });
    await t.step('un fallo al registrar la sesión permite reintentar con la misma clave', async () => {
      assert.equal((await checkout(requestCheckout({amount_mxn:50,request_id:key}))).status,503);
      assert.equal((await webhook(await event('checkout.session.completed'))).status,503);
      const response=await checkout(requestCheckout({amount_mxn:50,request_id:key}));
      assert.equal(response.status,200);
      assert.equal((await response.json()).url,stripeSession.url);
      assert.deepEqual(idempotencyKeys,['jcv:'+user+':'+key,'jcv:'+user+':'+key]);
      assert.equal(donation?.status,'pending');
    });
    await t.step('firma, identidad, importe y pago se verifican antes de actualizar', async () => {
      assert.equal((await webhook(await event('checkout.session.completed',{},false))).status,400);
      assert.equal((await webhook(await event('checkout.session.completed',{amount_total:1}))).status,400);
      assert.equal((await webhook(await event('checkout.session.completed',{client_reference_id:'otra-cuenta'}))).status,400);
      assert.equal((await webhook(await event('checkout.session.completed',{payment_status:'unpaid'}))).status,200);
      assert.equal(donation?.status,'pending'); assert.equal(writes,0);
    });
    await t.step('webhooks repetidos y fuera de orden conservan el estado final', async () => {
      assert.equal((await webhook(await event('checkout.session.expired'))).status,200);
      assert.equal(donation?.status,'failed');
      assert.equal((await webhook(await event('checkout.session.async_payment_succeeded'))).status,200);
      assert.equal((await webhook(await event('checkout.session.completed'))).status,200);
      assert.equal((await webhook(await event('checkout.session.async_payment_failed'))).status,200);
      assert.equal(donation?.status,'succeeded'); assert.equal(writes,2);
    });
  } finally {
    globalThis.fetch = original;
    for (const name of Object.keys(env)) Deno.env.delete(name);
  }
});
