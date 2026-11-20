import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { surveys, answerKeys, isQuestionAnswered, isQuestionVisible } from '../src/data/surveys.ts';

const db = new PGlite();
const [tec, second, normal, admin, pendingTec] = [1,2,3,4,5].map(n => '00000000-0000-4000-8000-00000000000' + n);
const survey = surveys[0];
function complete() {
  const answers = {};
  for (const q of survey.questions) {
    if (!isQuestionVisible(q, answers)) continue;
    const choice = q.type === 'single' ? q.options[0] : q.type === 'multi' ? 'Sí' : q.scale[0];
    for (const key of answerKeys(q)) answers[key] = choice;
    assert.ok(isQuestionAnswered(q, answers));
  }
  return answers;
}
async function as(id) {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id || '']);
  await db.exec(id ? 'SET ROLE authenticated' : 'SET ROLE anon');
}
const submit = (answers, id = survey.id) => db.query('SELECT public.nico_submit_survey($1,$2::jsonb) AS inserted', [id, JSON.stringify(answers)]);
const publish = (kind,id,visible) => db.query('SELECT public.nico_set_publication($1,$2,$3)', [kind,id,visible]);

before(async () => {
  // PostgreSQL local reproduce las identidades asignadas por Supabase Auth.
  await db.exec(`CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated;`);
  for (const file of ['20261120000100_nico_base.sql','20261120000200_nico_catalog.sql']) {
    await db.exec(await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'));
  }
  for (const [id, email] of [[tec,'uno@tec.mx'],[second,'dos@tec.mx'],[normal,'persona@example.org'],[admin,'admin@example.org'],[pendingTec,'pendiente@tec.mx']]) {
    await db.exec('RESET ROLE');
    await db.query('INSERT INTO auth.users VALUES ($1,$2,$3)', [id,email,id === pendingTec ? null : new Date()]);
    await as(id);
    if (id !== pendingTec) await db.query('SELECT public.nico_sync_profile()');
  }
  await db.exec('RESET ROLE');
  await db.query("UPDATE profiles SET role='admin' WHERE id=$1",[admin]);
});
after(() => db.close());

test('el catálogo del servidor conserva todas las opciones y condiciones de la app', async () => {
  await as(null);
  const {rows} = await db.query('SELECT id,prompt,options FROM survey_questions ORDER BY sort_order');
  assert.equal(rows.length,survey.questions.length);
  rows.forEach((r,i) => {
    const {id,prompt,...options}=survey.questions[i];
    assert.deepEqual(r,{id,prompt,options});
  });
});

test('invitado, correo particular y correo Tec sin confirmar no pueden enviar', async () => {
  for (const id of [null,normal,pendingTec]) {
    await as(id); await assert.rejects(submit(complete()));
  }
  await as(pendingTec);
  await assert.rejects(db.query('SELECT public.nico_sync_profile()'));
});

test('preguntas obligatorias, opciones, matrices, selección múltiple y condicionales', async () => {
  await as(tec);
  const answers=complete();
  const invalid={...answers, [survey.questions[0].id]:'Opción ajena al catálogo'};
  assert.equal(isQuestionAnswered(survey.questions[0], invalid),false);
  await assert.rejects(submit(invalid));
  await assert.rejects(submit({...answers, otra:'Sí'}));
  await assert.rejects(submit({...answers, T_Q_13_1:'Tal vez'}));
  const missing={...answers}; delete missing[survey.questions[0].id];
  await assert.rejects(submit(missing));
  const conditional=survey.questions.find(q=>q.visibleWhen?.op === 'eq');
  const hidden={...answers,[conditional.visibleWhen.key]:'No'};
  await assert.rejects(submit(hidden));
  for(const key of answerKeys(conditional)) delete hidden[key];
  assert.equal((await submit(hidden)).rows[0].inserted,true);
  assert.equal((await submit(hidden)).rows[0].inserted,false);
  await assert.rejects(db.query('SELECT answers FROM survey_submissions'));
  assert.equal((await db.query('SELECT survey_id FROM survey_submissions')).rows.length,1);
  await as(second);
  assert.equal((await db.query('SELECT survey_id FROM survey_submissions')).rows.length,0);
});

test('la moderación de un tema también oculta sus respuestas', async () => {
  await as(normal);
  const {rows:[{id}]}=await db.query("SELECT nico_post_topic('Transporte','Horarios propuestos') AS id");
  await db.query("SELECT nico_post_reply($1,'Más frecuencias')",[id]);
  await assert.rejects(db.query("SELECT nico_post_reply($1,'   ')",[id]));
  await assert.rejects(publish('forum_topics',id,false));
  await assert.rejects(db.query("UPDATE profiles SET role='admin' WHERE id=$1",[normal]));
  await as(null);
  assert.equal((await db.query('SELECT id FROM forum_replies')).rows.length,1);
  await assert.rejects(db.query('SELECT user_id FROM forum_topics'));
  await as(admin);
  await publish('forum_topics',id,false);
  await as(null);
  assert.equal((await db.query('SELECT id FROM forum_topics')).rows.length,0);
  assert.equal((await db.query('SELECT id FROM forum_replies')).rows.length,0);
  await as(normal);
  await assert.rejects(db.query("SELECT nico_post_reply($1,'Prueba')",[id]));
  await as(admin);
  await publish('forum_topics',id,true);
});

test('solo un administrador cambia la visibilidad de encuestas, noticias e indicadores', async () => {
  for (const table of ['surveys','news','indicators']) {
    await as(admin);
    const {rows:[{id}]}=await db.query('SELECT id FROM '+table+' LIMIT 1');
    await publish(table,id,false);
    await as(null);
    assert.equal((await db.query('SELECT id FROM '+table+' WHERE id=$1',[id])).rows.length,0);
    if (table==='surveys') assert.equal((await db.query('SELECT id FROM survey_questions WHERE survey_id=$1',[id])).rows.length,0);
    await as(admin);
    await publish(table,id,true);
  }
});

test('historial de donativos privado y estado modificable solo por el servicio', async () => {
  await db.exec('RESET ROLE; SET ROLE service_role');
  await db.query("INSERT INTO donations(user_id,amount_mxn,stripe_session_id) VALUES ($1,50,'cs_fixture')",[tec]);
  await as(second);
  assert.equal((await db.query('SELECT id FROM donations')).rows.length,0);
  await as(tec);
  assert.equal((await db.query('SELECT status FROM donations')).rows[0].status,'pending');
  await assert.rejects(db.query("UPDATE donations SET status='succeeded'"));
  await as(null);
  await assert.rejects(db.query('SELECT id FROM donations'));
});
