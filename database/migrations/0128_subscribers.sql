-- Reader subscriptions (operations/subscription.ts): one row per address, unconfirmed until the mail's link is
-- clicked. The address is the key; the token is the whole authority for confirm and unsubscribe; last_report_key
-- keeps a digest from being sent twice; request_ip is only there to stop one network from filling the list.
CREATE TABLE subscribers (
  email text PRIMARY KEY,
  token text NOT NULL UNIQUE,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  last_report_key text,
  request_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
