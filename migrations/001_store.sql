-- Additive, isolated schema. Rollback before real orders: DROP SCHEMA sierra_store CASCADE.
CREATE SCHEMA IF NOT EXISTS sierra_store;
CREATE TABLE IF NOT EXISTS sierra_store.orders(
 id uuid PRIMARY KEY,code text NOT NULL UNIQUE,token_hash text NOT NULL UNIQUE,
 idempotency_key uuid NOT NULL UNIQUE,request_hash text NOT NULL,
 access_token_ciphertext text NOT NULL,customer jsonb NOT NULL,items jsonb NOT NULL,subtotal_ars numeric(14,2) NOT NULL CHECK(subtotal_ars>0),
 shipping_ars numeric(14,2) CHECK(shipping_ars>=0),shipping_service text,shipping_transit text,
 quote_expires_at timestamptz,preference_id text UNIQUE,payment_url text,
 payment_status text NOT NULL DEFAULT 'unpaid',fulfillment text NOT NULL DEFAULT 'awaiting_quote',
 payment_id text UNIQUE,paid_at timestamptz,dispatch_by date,tracking text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sierra_store.payments(
 id text PRIMARY KEY,order_id uuid NOT NULL REFERENCES sierra_store.orders(id),status text NOT NULL,
 amount_ars numeric(14,2) NOT NULL,refunded_ars numeric(14,2) NOT NULL DEFAULT 0,
 provider_updated_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sierra_store.order_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,order_id uuid NOT NULL REFERENCES sierra_store.orders(id),
 kind text NOT NULL,detail jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sierra_store.withdrawals(
 id uuid PRIMARY KEY,code text NOT NULL UNIQUE,order_code text NOT NULL,email text NOT NULL,
 reason text,state text NOT NULL DEFAULT 'received',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sierra_store.admin_users(
 id uuid PRIMARY KEY,email text NOT NULL UNIQUE,password_hash text NOT NULL,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sierra_store.admin_sessions(token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES sierra_store.admin_users(id),expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS sierra_store.rate_limits(key text PRIMARY KEY,hits integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS orders_queue_idx ON sierra_store.orders(fulfillment,created_at DESC);
CREATE INDEX IF NOT EXISTS events_order_idx ON sierra_store.order_events(order_id,created_at);
REVOKE ALL ON SCHEMA sierra_store FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA sierra_store FROM PUBLIC;
