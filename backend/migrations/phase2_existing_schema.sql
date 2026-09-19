-- Phase 2 migration for the existing shared NFT Ticket Supabase project.
-- This migration preserves existing tables, columns, and data.

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS venue TEXT;

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS blockchain_event_id BIGINT;

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS contract_address TEXT;

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS creation_tx_hash TEXT;

CREATE TABLE IF NOT EXISTS public.organizer_wallets (
    wallet TEXT PRIMARY KEY,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);