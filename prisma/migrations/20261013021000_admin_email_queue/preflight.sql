-- READ ONLY. Run against the explicitly identified deployment target after approval.
-- Do not combine with migration.sql or automatically infer/repair historical intent.
SELECT status, COUNT(*) AS campaigns, SUM(recipient_count) AS intended_recipients
FROM email_campaigns GROUP BY status ORDER BY status;
SELECT COUNT(*) AS duplicate_campaign_recipient_groups FROM (
  SELECT campaign_id, LOWER(BTRIM(to_email)) FROM email_deliveries
  WHERE campaign_id IS NOT NULL GROUP BY campaign_id, LOWER(BTRIM(to_email)) HAVING COUNT(*) > 1
) duplicates;
SELECT COUNT(*) AS partially_started_campaigns FROM email_campaigns c
WHERE c.status IN ('DRAFT', 'SCHEDULED') AND EXISTS (SELECT 1 FROM email_deliveries d WHERE d.campaign_id = c.id);
SELECT status, COUNT(*) AS deliveries, COUNT(*) FILTER (WHERE resend_id IS NULL) AS without_provider_id
FROM email_deliveries GROUP BY status ORDER BY status;
SELECT COUNT(*) AS missing_version_history FROM email_templates t
WHERE NOT EXISTS (SELECT 1 FROM email_template_versions v WHERE v.template_id = t.id);
-- Existing deliveries retain NULL queue identity/snapshot fields. New unique indexes
-- therefore preserve duplicate history. They protect every new version-2 campaign.
-- Old active/scheduled campaigns are not resumed by version-2 workers automatically.
-- Rollback: pause EMAIL_CAMPAIGNS_ENABLED; retain the additive ledger/schema; do not
-- restore the old processor or drop UNCERTAIN/accepted operation evidence.
