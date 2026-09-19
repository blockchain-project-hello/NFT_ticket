import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export type Event = {
  id: string;
  name: string;
  description?: string | null;
  organizer_wallet: string;
  venue?: string | null;
  base_price_wei: number;
  total_supply: number;
  tickets_minted: number;
  event_date: string;
  image_url?: string | null;
  blockchain_event_id: number;
  contract_address: string;
  creation_tx_hash: string;
};

export const organizerAuthorizationMessage = (wallet: string) =>
  `NFT Ticketing organizer authorization: ${wallet.toLowerCase()}`;

const signedWalletHeaders = (wallet: string, signature: string) => ({
  'X-Wallet-Address': wallet,
  'X-Wallet-Signature': signature,
});

export const getEvents = async (): Promise<Event[]> => {
  const response = await api.get('/api/events');
  return response.data;
};

export const getEvent = async (eventId: string): Promise<Event> => {
  const response = await api.get(`/api/events/${eventId}`);
  return response.data;
};

export const getOrganizerEvents = async (wallet: string, signature: string): Promise<Event[]> => {
  const response = await api.get('/api/events/organizer', {
    headers: signedWalletHeaders(wallet, signature),
  });
  return response.data;
};

export const createEventMetadata = async (
  event: Omit<Event, 'id' | 'tickets_minted'>,
  wallet: string,
  signature: string,
): Promise<Event> => {
  const response = await api.post('/api/events', event, {
    headers: signedWalletHeaders(wallet, signature),
  });
  return response.data;
};

export const updateEventMetadata = async (
  eventId: string,
  changes: Partial<Pick<Event, 'name' | 'description' | 'venue' | 'event_date' | 'image_url'>>,
  wallet: string,
  signature: string,
): Promise<Event> => {
  const response = await api.patch(`/api/events/${eventId}`, changes, {
    headers: signedWalletHeaders(wallet, signature),
  });
  return response.data;
};

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

export const getMarketplaceListings = async () => {
  const response = await api.get('/api/marketplace');
  return response.data;
};

export const syncMarketplaceListing = async (payload: {
  event_id: string;
  token_id: number;
  seller: string;
  price_wei: string;
  listing_tx_hash: string;
}) => {
  await api.post('/api/marketplace/listings/sync', payload);
};

export const syncMarketplaceSale = async (payload: {
  event_id: string;
  token_id: number;
  buyer: string;
  sale_tx_hash: string;
}) => {
  await api.post('/api/marketplace/sales/sync', payload);
};

export const verifyTicketAtGate = async (payload: { event_id: string; token_id: number; timestamp: number; signature: string; }) => { try { const response = await api.post('/api/verification/verify-ticket', payload); return response.data; } catch (error: any) { console.error('Failed to verify ticket:', error); return { success: false, message: error.response?.data?.message || 'Gate verification failed.' }; } };
