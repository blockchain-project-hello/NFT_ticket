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
    base_price BIGINT NOT NULL,          -- in wei
    total_supply INTEGER NOT NULL,
    tickets_minted INTEGER DEFAULT 0,
    event_date TIMESTAMPTZ,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_organizer ON events(organizer_wallet);

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

-- ===================== SEED DATA (for development) =====================
INSERT INTO events (id, name, description, organizer_wallet, base_price, total_supply, event_date, image_url)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ETH Mumbai 2025', 'The biggest Ethereum conference in India', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 10000000000000000, 500, '2025-12-15T09:00:00Z', NULL),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Web3 Goa Festival', 'A 3-day Web3 festival on the beaches of Goa', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 50000000000000000, 200, '2025-11-20T10:00:00Z', NULL),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'DeFi Delhi Summit', 'Expert talks on DeFi protocols and yield strategies', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 25000000000000000, 300, '2026-01-10T08:00:00Z', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert some seed tickets
INSERT INTO tickets (token_id, event_id, current_owner, status, list_price)
VALUES
    (1, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', 'listed', 15000000000000000),
    (2, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '0x90F79bf6EB2c4f870365E785982E1f101E93b906', 'listed', 20000000000000000),
    (3, 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', 'listed', 60000000000000000)
ON CONFLICT (token_id) DO NOTHING;

-- Insert seed sales history
INSERT INTO sales_history (event_id, token_id, seller, buyer, price, royalty_paid, timestamp)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 1, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', 10000000000000000, 500000000000000, NOW() - INTERVAL '2 days'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', '0x90F79bf6EB2c4f870365E785982E1f101E93b906', 10000000000000000, 500000000000000, NOW() - INTERVAL '1 day'),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 3, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', 50000000000000000, 2500000000000000, NOW() - INTERVAL '3 hours')
ON CONFLICT DO NOTHING;

-- Insert a seed campaign
INSERT INTO campaigns (event_id, goal, funded, deadline, state)
VALUES
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 5000000000000000000, 1200000000000000000, NOW() + INTERVAL '30 days', 'active')
ON CONFLICT DO NOTHING;
