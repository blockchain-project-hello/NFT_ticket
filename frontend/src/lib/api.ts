import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getResaleQuote = async (
  eventId: string,
  tokenId: number,
  sellerAddress: string,
  buyerAddress: string
) => {
  try {
    const response = await api.post('/api/pricing/resale-quote', {
      event_id: eventId.toString(),
      token_id: tokenId,
      seller_address: sellerAddress,
      buyer_address: buyerAddress,
    });
    return response.data;
  } catch (error) {
    console.warn('Backend not reachable for resale quote, using mock', error);
    return {
      max_price: '1500000000000000000',
      deadline: Math.floor(Date.now() / 1000) + 3600,
      nonce: Math.floor(Math.random() * 1000000).toString(),
      signature: '0x' + '00'.repeat(65),
    };
  }
};

export const chatWithAssistant = async (
  organizerWallet: string,
  message: string
) => {
  try {
    const response = await api.post('/api/assistant/chat', {
      organizer_wallet: organizerWallet,
      message,
    });
    return response.data;
  } catch (error) {
    console.warn('Backend not reachable for chat, using mock', error);
    return {
      reply:
        "I'm your AI assistant! The backend seems to be disconnected right now, but I can help you analyze your ticket sales and engagement metrics once it's back online.",
      context_used: ['mock_data'],
    };
  }
};

export const getEvents = async () => {
  return [
    {
      id: 1,
      name: 'Neon Nights Music Festival',
      date: '2026-10-31',
      basePrice: '0.01',
      supply: 1000,
      minted: 450,
      image:
        'https://images.unsplash.com/photo-1540039155733-d7696d4ebaf7?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 2,
      name: 'Web3 Developer Summit',
      date: '2026-11-15',
      basePrice: '0.02',
      supply: 500,
      minted: 500,
      image:
        'https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 3,
      name: 'Virtual Reality Expo',
      date: '2026-12-05',
      basePrice: '0.015',
      supply: 2000,
      minted: 120,
      image:
        'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&w=1000&q=80',
    },
  ];
};

export const getMarketplaceListings = async () => {
  try {
    throw new Error("fallback");
  } catch (err) {
    return [
      { tokenId: 3, eventId: 1, eventName: "Neon Nights Music Festival", seller: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", price: "0.012", status: "Active" }
    ];
  }
};

export const verifyTicketAtGate = async (payload: { event_id: string; token_id: number; timestamp: number; signature: string; }) => { try { const response = await api.post('/api/verification/verify-ticket', payload); return response.data; } catch (error: any) { console.error('Failed to verify ticket:', error); return { success: false, message: error.response?.data?.message || 'Gate verification failed.' }; } };
