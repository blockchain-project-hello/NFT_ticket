"use client";

import { useEffect, useState } from 'react';
import { getMarketplaceListings, getResaleQuote, syncMarketplaceSale } from '@/lib/api';
import { TicketCard } from '@/components/features/TicketCard';
import { Search, Filter, AlertCircle } from 'lucide-react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { TICKET_NFT_ABI } from '@/config/abis';
import { formatEther } from 'viem';

export default function Marketplace() {
  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const contractAddress = process.env.NEXT_PUBLIC_TICKET_CONTRACT_ADDRESS as `0x${string}`;

  useEffect(() => {
    void loadListings();
  }, []);

  const loadListings = async () => {
    setIsLoading(true);
    try {
      setListings(await getMarketplaceListings());
    } catch (error: any) {
      setQuoteError(error?.response?.data?.detail || 'Unable to load marketplace listings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuy = async (ticket: any) => {
    if (!address) {
      alert("Please connect wallet first");
      return;
    }
    
    setBuyingId(ticket.token_id);
    setQuoteError(null);

    try {
      if (!publicClient) throw new Error('Blockchain client is unavailable.');
      const owner = await publicClient.readContract({
        address: contractAddress,
        abi: TICKET_NFT_ABI,
        functionName: 'ownerOf',
        args: [BigInt(ticket.token_id)],
      }) as `0x${string}`;
      const listing = await publicClient.readContract({
        address: contractAddress,
        abi: TICKET_NFT_ABI,
        functionName: 'resaleListings',
        args: [BigInt(ticket.token_id)],
      }) as readonly [boolean, bigint];
      if (owner.toLowerCase() !== ticket.seller.toLowerCase() || !listing[0]) {
        throw new Error('This listing is no longer active.');
      }
      if (owner.toLowerCase() === address.toLowerCase()) {
        throw new Error('You cannot buy your own ticket.');
      }

      const quote = await getResaleQuote(ticket.blockchain_event_id.toString(), ticket.token_id, owner, address);
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: TICKET_NFT_ABI,
        functionName: 'resaleTicket',
        args: [
          BigInt(ticket.token_id),
          BigInt(quote.max_price),
          BigInt(quote.nonce),
          BigInt(quote.deadline),
          quote.signature as `0x${string}`
        ],
        value: BigInt(quote.max_price),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await syncMarketplaceSale({ event_id: ticket.event_id, token_id: ticket.token_id, buyer: address, sale_tx_hash: hash });
      await loadListings();
    } catch (err: any) {
      setQuoteError("Failed to fetch quote or execute tx: " + (err.message || "Unknown error"));
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 w-full animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Secondary Market</h1>
          <p className="text-gray-400">Buy and sell verified NFT tickets safely.</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search events..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <button className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      {quoteError && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{quoteError}</p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-96 glass-card rounded-2xl animate-pulse bg-white/5"></div>
          ))}
        </div>
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map((ticket, index) => (
            <div key={ticket.token_id} className="animate-slideUp" style={{ animationDelay: `${index * 50}ms` }}>
              <TicketCard
                tokenId={ticket.token_id}
                eventId={ticket.blockchain_event_id}
                eventName={ticket.event_name}
                seller={ticket.seller}
                price={formatEther(BigInt(ticket.resale_price_wei))}
                basePrice={formatEther(BigInt(ticket.base_price_wei))}
                eventDate={ticket.event_date}
                venue={ticket.venue}
                imageUrl={ticket.event_image_url}
                status="Active"
                onBuy={() => handleBuy(ticket)}
                isLoading={buyingId === ticket.token_id}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 glass-card rounded-3xl">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No tickets listed</h3>
          <p className="text-gray-400">Check back later for new secondary listings.</p>
        </div>
      )}
    </div>
  );
}
