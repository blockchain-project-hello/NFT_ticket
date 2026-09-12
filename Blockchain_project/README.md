# NFT Ticketing Monorepo

Decentralized NFT Ticketing & Event Crowdfunding Monorepo powered by Polygon, FastAPI, and Next.js.

## Project Structure

```
nft-ticketing-monorepo/
├── .github/
│   └── workflows/
│       ├── contracts-ci.yml       # Automated Foundry tests for smart contracts
│       └── backend-ci.yml         # Automated Pytest for FastAPI
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/
│   │   │   │   ├── chat.py        # RAG Assistant endpoints
│   │   │   │   └── pricing.py     # EIP-712 Dynamic Pricing endpoints
│   │   │   └── router.py          # API route aggregator
│   │   ├── core/
│   │   │   ├── config.py          # Environment variables and API keys
│   │   │   └── security.py        # EIP-712 ECDSA signing logic
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic validation models
│   │   ├── services/
│   │   │   ├── indexer.py         # Web3.py background task for Supabase sync
│   │   │   └── rag_engine.py      # Groq/Gemini LLM and pgvector logic
│   │   └── main.py                # FastAPI application entry point
│   ├── tests/
│   │   ├── test_pricing.py
│   │   └── test_signatures.py
│   ├── requirements.txt           # Python dependencies (FastAPI, web3, supabase)
│   └── .env.example               # Template for backend environment variables
├── contracts/
│   ├── script/
│   │   └── Deploy.s.sol           # Deployment script for Polygon Amoy
│   ├── src/
│   │   ├── CrowdfundEscrow.sol    # Decentralized event financing logic
│   │   └── TicketNFT.sol          # Primary minting and secondary market logic
│   ├── test/
│   │   ├── CrowdfundEscrow.t.sol  # Foundry tests for escrow state machine
│   │   └── TicketNFT.t.sol        # Foundry tests for EIP-712 signature verification
│   ├── foundry.toml               # Foundry compiler and network configuration
│   └── .env.example               # Template for RPC URLs and private keys
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── crowdfund/
│   │   │   │   └── [id]/page.tsx  # Crowdfunding UI
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx       # Organizer analytics and AI chat UI
│   │   │   ├── events/
│   │   │   │   └── [id]/page.tsx  # Event details and minting UI
│   │   │   ├── marketplace/
│   │   │   │   └── page.tsx       # Secondary market UI
│   │   │   ├── layout.tsx         # Root layout with RainbowKit provider
│   │   │   └── page.tsx           # Landing page
│   │   ├── components/
│   │   │   ├── features/          # Domain-aware components (e.g., TicketCard)
│   │   │   └── ui/                # shadcn/ui primitives (buttons, modals)
│   │   ├── config/
│   │   │   ├── abis/              # JSON ABIs exported from Foundry
│   │   │   └── wagmi.ts           # Polygon Amoy network and wallet config
│   │   └── lib/                   # API clients and utility functions
│   ├── package.json               # Next.js, Wagmi, Viem dependencies
│   ├── tailwind.config.ts         # Styling configuration
│   └── .env.local.example         # Template for frontend environment variables
├── .gitignore                     # Ignores node_modules, Python __pycache__, .env files
├── docker-compose.yml             # Orchestrates local PostgreSQL/pgvector for development
└── README.md                      # Setup instructions, architecture diagram, and run commands
```
