-- CreateTable
CREATE TABLE "admin_message_templates" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_message_templates_pkey" PRIMARY KEY ("id")
);

-- Seed default templates
INSERT INTO "admin_message_templates" ("id", "label", "body", "sort_order", "updated_at") VALUES
  ('tpl_content_light', 'Content too light', 'Hi, we noticed your profile content is a bit light. Adding more detail about your studio, equipment, and services will help potential clients find and choose you. Please update your profile when you get a chance!', 1, NOW()),
  ('tpl_missing_content', 'Missing content', 'Hi, your profile appears to be missing some key content. Please take a moment to fill in your studio description, services offered, and equipment list so visitors can learn more about what you offer.', 2, NOW()),
  ('tpl_great_profile', 'Great profile - verification', 'Great profile! We love what we see and would like to verify your studio. We''ll be in touch shortly with the next steps for verification.', 3, NOW()),
  ('tpl_no_free_verify', 'No verification on Free plans', 'Thanks for setting up your profile! We''re not currently verifying voiceover studios on Free plans. If you''d like to get verified, please consider upgrading to a Premium membership.', 4, NOW()),
  ('tpl_share_social', 'Share on social media', 'We love your profile! Would you be willing to share it on your social media channels? It would help us grow the community and bring more visibility to your studio.', 5, NOW());
