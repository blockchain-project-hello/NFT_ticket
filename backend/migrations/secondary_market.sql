-- Additive migration for secondary-market indexing.
-- Existing tables and rows are preserved.

ALTER TABLE public.tickets
    ADD COLUMN IF NOT EXISTS listing_tx_hash TEXT;