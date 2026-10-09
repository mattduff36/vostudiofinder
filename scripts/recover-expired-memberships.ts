/** Snapshot-bound legacy recovery. No emails, billing calls, category changes, or deletions. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';
import { recoveryExclusion } from '../src/lib/subscriptions/recovery-policy';
import { initialLegacyOfferState } from '../src/lib/subscriptions/legacy-offer';

const args = process.argv.slice(2);
const value = (key: string) => args[args.indexOf(key) + 1];
for (const key of ['--env-file', '--expected-host', '--snapshot']) {
  if (!args.includes(key) || !value(key) || value(key).startsWith('--')) throw new Error(`Required: ${key}`);
}
const snapshotPath = path.resolve(value('--snapshot'));
if (snapshotPath.startsWith(path.resolve('.') + path.sep)) throw new Error('Snapshot must be outside the repository');
const env = dotenv.parse(fs.readFileSync(value('--env-file')));
const url = new URL(env.DATABASE_URL!);
if (url.hostname !== value('--expected-host')) throw new Error('Database host mismatch');
const c = new pg.Client({ connectionString: env.DATABASE_URL });
const metadataKeys = ['legacy_premium_offer_state', 'membership_recovery_run'];
const hash = (data: unknown) => createHash('sha256').update(JSON.stringify(data)).digest('hex');
const sql = `SELECT u.id AS user_id,u.username,u.role,u.status AS user_status,u.membership_tier,
 u.deletion_status,u.deletion_requested_at,u.deletion_scheduled_for,u.last_login,u.updated_at AS user_updated_at,
 s.id AS studio_id,s.status AS studio_status,s.is_profile_visible,s.admin_review,s.created_at AS studio_created_at,
 s.updated_at AS studio_updated_at,s.is_premium,s.is_verified,s.is_featured,s.featured_until,s.show_phone,s.show_directions,
 s.latitude,s.longitude,s.city,sub.current_period_end AS expiry,
 EXISTS(SELECT 1 FROM studio_studio_types t WHERE t.studio_id=s.id AND t.studio_type='VOICEOVER') AS voiceover,
 EXISTS(SELECT 1 FROM refunds r WHERE r.user_id=u.id) AS has_refund,
 EXISTS(SELECT 1 FROM support_tickets t WHERE t.user_id=u.id AND t.status<>'CLOSED') AS has_support_hold,
 EXISTS(SELECT 1 FROM payments p WHERE p.user_id=u.id AND p.status='SUCCEEDED') AS has_paid,
 EXISTS(SELECT 1 FROM subscriptions p WHERE p.user_id=u.id AND (p.stripe_subscription_id IS NOT NULL OR p.stripe_customer_id IS NOT NULL OR p.paypal_subscription_id IS NOT NULL)) AS provider_linked,
 EXISTS(SELECT 1 FROM email_deliveries d JOIN email_campaigns ec ON ec.id=d.campaign_id WHERE lower(d.to_email)=lower(u.email) AND ec.template_key='legacy-user-announcement' AND d.status='SENT') AS sent_legacy_offer,
 COALESCE((SELECT json_agg(m ORDER BY m.key) FROM user_metadata m WHERE m.user_id=u.id AND m.key=ANY($1::text[])), '[]'::json) AS metadata
 FROM users u JOIN studio_profiles s ON s.user_id=u.id
 LEFT JOIN LATERAL(SELECT current_period_end FROM subscriptions WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1)sub ON true
 ORDER BY u.id`;
async function rows() { return JSON.parse(JSON.stringify((await c.query(sql, [metadataKeys])).rows)); }
function save(file: string, data: unknown) { fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' }); }
await c.connect();
try {
  const apply = args.includes('--apply');
  const rollback = args.includes('--rollback');
  if (apply && rollback) throw new Error('Choose apply or rollback');
  await c.query(apply || rollback ? 'BEGIN' : 'BEGIN READ ONLY');
  await c.query("SET LOCAL statement_timeout='30s'");
  await c.query("SET LOCAL lock_timeout='5s'");
  if (!apply && !rollback) {
    const all = await rows();
    const selected = all.filter((r: any) => !recoveryExclusion(r));
    const excluded: Record<string, number> = {};
    for (const row of all) { const why = recoveryExclusion(row); if (why) excluded[why] = (excluded[why] || 0) + 1; }
    const snapshot = { version: 1, run: randomUUID(), host: url.hostname, database: url.pathname,
      createdAt: new Date().toISOString(), selected, hash: hash(selected), excluded };
    save(snapshotPath, snapshot);
    console.log(JSON.stringify({ mode: 'dry-run', eligible: selected.length,
      newlyPublic: selected.filter((r: any) => r.studio_status === 'INACTIVE').length,
      unclaimedOffers: selected.filter((r: any) => !r.last_login).length, excluded, snapshot: snapshotPath, hash: snapshot.hash }));
    await c.query('ROLLBACK');
  } else {
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    if (snapshot.version !== 1 || snapshot.host !== url.hostname || snapshot.database !== url.pathname
      || hash(snapshot.selected) !== snapshot.hash) throw new Error('Invalid snapshot identity/hash');
    const ids = snapshot.selected.map((r: any) => r.user_id);
    if (!ids.length) throw new Error('No eligible records');
    await c.query('SELECT id FROM users WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE', [ids]);
    await c.query('SELECT id FROM studio_profiles WHERE user_id=ANY($1::text[]) ORDER BY id FOR UPDATE', [ids]);
    await c.query('SELECT id FROM subscriptions WHERE user_id=ANY($1::text[]) ORDER BY id FOR UPDATE', [ids]);
    const current = (await rows()).filter((r: any) => ids.includes(r.user_id));
    const expected = rollback ? JSON.parse(fs.readFileSync(snapshotPath + '.applied.json', 'utf8')).after : snapshot.selected;
    if (hash(current) !== hash(expected)) throw new Error('Snapshot stale: live data changed; no records updated');
    for (const before of snapshot.selected) {
      if (rollback) {
        await c.query('UPDATE users SET membership_tier=$2,updated_at=$3 WHERE id=$1', [before.user_id,before.membership_tier,before.user_updated_at]);
        await c.query(`UPDATE studio_profiles SET status=$2,is_premium=$3,is_verified=$4,is_featured=$5,featured_until=$6,show_phone=$7,show_directions=$8,updated_at=$9 WHERE id=$1`,
          [before.studio_id,before.studio_status,before.is_premium,before.is_verified,before.is_featured,before.featured_until,before.show_phone,before.show_directions,before.studio_updated_at]);
        await c.query('DELETE FROM user_metadata WHERE user_id=$1 AND key=ANY($2::text[])',[before.user_id,metadataKeys]);
        for (const m of before.metadata) await c.query('INSERT INTO user_metadata(id,user_id,key,value,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6)',[m.id,m.user_id,m.key,m.value,m.created_at,m.updated_at]);
      } else {
        if (recoveryExclusion(before)) throw new Error('Eligibility changed');
        await c.query("UPDATE users SET membership_tier='BASIC',updated_at=now() WHERE id=$1", [before.user_id]);
        await c.query("UPDATE studio_profiles SET status='ACTIVE',is_premium=false,is_verified=false,is_featured=false,featured_until=NULL,show_phone=false,show_directions=false,updated_at=now() WHERE id=$1",[before.studio_id]);
        const offer = initialLegacyOfferState(before.last_login ? new Date(before.last_login) : null, before.expiry ? new Date(before.expiry) : null, new Date());
        await c.query(`INSERT INTO user_metadata(id,user_id,key,value,updated_at) VALUES($1,$2,$3,$4,now()) ON CONFLICT(user_id,key) DO NOTHING`,[randomUUID(),before.user_id,'legacy_premium_offer_state',offer]);
        await c.query(`INSERT INTO user_metadata(id,user_id,key,value,updated_at) VALUES($1,$2,$3,$4,now()) ON CONFLICT(user_id,key) DO UPDATE SET value=EXCLUDED.value,updated_at=EXCLUDED.updated_at`,[randomUUID(),before.user_id,'membership_recovery_run',snapshot.run]);
      }
    }
    const after = (await rows()).filter((r: any) => ids.includes(r.user_id));
    // Save recovery evidence before commit; any write failure rolls back the database.
    const receiptPath = snapshotPath + (rollback ? '.rolled-back.json' : '.applied.json');
    save(receiptPath, { run: snapshot.run, after, hash: hash(after), committed: false });
    await c.query('COMMIT');
    fs.writeFileSync(receiptPath, JSON.stringify({ run: snapshot.run, after, hash: hash(after), committed: true }, null, 2) + '\n');
    console.log(JSON.stringify({ mode: rollback ? 'rollback' : 'apply', affected: ids.length, receipt: receiptPath }));
  }
} catch (e) { await c.query('ROLLBACK'); throw e; }
finally { await c.end(); }
