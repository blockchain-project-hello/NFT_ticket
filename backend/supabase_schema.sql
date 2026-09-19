-- =============================================================
-- NFT Ticketing Platform — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor to create all tables
-- =============================================================

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ===================== EVENTS =====================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    organizer_wallet TEXT NOT NULL,
    venue TEXT,
    base_price_wei BIGINT NOT NULL,      -- in wei
    total_supply INTEGER NOT NULL,
    tickets_minted INTEGER DEFAULT 0,
    event_date TIMESTAMPTZ,
    image_url TEXT,
    blockchain_event_id BIGINT NOT NULL,
    contract_address TEXT NOT NULL,
    creation_tx_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_organizer ON events(organizer_wallet);
CREATE UNIQUE INDEX idx_events_chain_id ON events(contract_address, blockchain_event_id);

-- ===================== ORGANIZER ROLES =====================
CREATE TABLE IF NOT EXISTS organizer_wallets (
    wallet TEXT PRIMARY KEY,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration helpers for databases created from the earlier prototype schema.
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS base_price_wei BIGINT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS blockchain_event_id BIGINT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contract_address TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS creation_tx_hash TEXT;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'base_price'
    ) THEN
        UPDATE events SET base_price_wei = base_price WHERE base_price_wei IS NULL;
        ALTER TABLE events DROP COLUMN base_price;
    END IF;
END $$;

-- ===================== TICKETS =====================
CREATE TABLE IF NOT EXISTS tickets (
    token_id INTEGER PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    current_owner TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'listed', 'sold', 'used')),
    list_price BIGINT,                   -- in wei, set when listed for resale
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_owner ON tickets(current_owner);
CREATE INDEX idx_tickets_status ON tickets(status);

-- ===================== SALES HISTORY =====================
CREATE TABLE IF NOT EXISTS sales_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    token_id INTEGER NOT NULL,
    seller TEXT NOT NULL,
    buyer TEXT NOT NULL,
    price BIGINT NOT NULL,               -- in wei
    royalty_paid BIGINT DEFAULT 0,       -- in wei
    tx_hash TEXT,
    block_number BIGINT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_event ON sales_history(event_id);
CREATE INDEX idx_sales_timestamp ON sales_history(timestamp);

-- ===================== ORGANIZER DOCUMENTS (RAG) =====================
CREATE TABLE IF NOT EXISTS organizer_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    embedding vector(384),               -- sentence-transformers all-MiniLM-L6-v2 dimension
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orgdocs_event ON organizer_documents(event_id);

-- Create HNSW index for fast vector similarity search
CREATE INDEX idx_orgdocs_embedding ON organizer_documents
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ===================== CROWDFUND CAMPAIGNS =====================
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    goal BIGINT NOT NULL,                -- in wei
    funded BIGINT DEFAULT 0,             -- in wei
    deadline TIMESTAMPTZ NOT NULL,
    state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'funded', 'finalized', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_event ON campaigns(event_id);
CREATE INDEX idx_campaigns_state ON campaigns(state);

