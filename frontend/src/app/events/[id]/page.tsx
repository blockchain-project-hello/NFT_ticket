"use client";

import { useEffect, useState } from 'react';
import { getEvents } from '@/lib/api';
import { TransactionButton } from '@/components/features/TransactionButton';
import { Calendar, MapPin, Ticket, ShieldCheck, Users } from 'lucide-react';
import { useWriteContract } from 'wagmi';
import { TICKET_NFT_ABI } from '@/config/abis';
import { parseEther } from 'viem';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function EventDetail({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<any>(null);
  
  const contractAddress = process.env.NEXT_PUBLIC_TICKET_CONTRACT_ADDRESS as `0x${string}`;

  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  useEffect(() => {
    getEvents().then(events => {
      const found = events.find(e => e.id === parseInt(params.id));
      if (found) setEvent(found);
    });
  }, [params.id]);

  const handleMint = () => {
    if (!event) return;
    
    try {
      writeContract({
        address: contractAddress,
        abi: TICKET_NFT_ABI,
        functionName: 'mintTicket',
        args: [BigInt(event.id)],
        value: parseEther(event.basePrice),
      });
    } catch (err) {
      console.error("Minting error", err);
    }
  };

  if (!event) {
    return <div className="flex-1 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" /></div>;
  }

  const progressPercentage = (event.minted / event.supply) * 100;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 w-full animate-fadeIn">
      {/* Event Header */}
      <div className="relative rounded-3xl overflow-hidden h-[400px] mb-12 shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={event.image} alt={event.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="px-3 py-1 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full text-sm backdrop-blur-md flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full text-sm backdrop-blur-md flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Metaverse / Polygon
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">{event.name}</h1>
          </div>
          
          <div className="glass-card p-6 rounded-2xl md:min-w-[300px] text-center shrink-0">
            <div className="text-sm text-gray-400 mb-1">Mint Price</div>
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-6">
              {event.basePrice} MATIC
            </div>
            <TransactionButton
              label="Mint Ticket NFT"
              onClick={handleMint}
              isLoading={isPending}
              isSuccess={isSuccess}
              className="w-full shadow-lg shadow-violet-500/25"
              size="lg"
            />
            {error && <div className="text-red-400 text-xs mt-3 bg-red-950/50 p-2 rounded border border-red-500/20">{(error as Error).shortMessage || 'Failed to mint'}</div>}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Ticket className="w-6 h-6 text-violet-400" /> About Event
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg">
              Join us for the most anticipated web3 gathering of the year. Your NFT ticket grants you exclusive access to all keynotes, VIP networking zones, and special token-gated digital merch drops. 
              <br/><br/>
              By holding this NFT, you guarantee authenticity and avoid scalper fraud. Tickets can be safely resold on our secondary marketplace with enforced royalties for the organizers.
            </p>
          </section>
          
          <section className="glass-card rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Ticket Availability</h3>
              <span className="text-sm font-medium text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">
                {event.supply - event.minted} Remaining
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-4 mb-2 overflow-hidden border border-gray-700">
              <div 
                className="bg-gradient-to-r from-violet-500 to-cyan-400 h-4 rounded-full transition-all duration-1000" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>{event.minted} Minted</span>
              <span>{event.supply} Total Supply</span>
            </div>
          </section>
        </div>
        
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border-t-4 border-t-cyan-400">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400"/> Smart Contract
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Address</span>
                <span className="text-violet-400 truncate max-w-[120px]">{contractAddress || '0x...'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Network</span>
                <span className="text-white">Polygon Amoy</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Standard</span>
                <span className="text-white">ERC-721</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border-t-4 border-t-violet-400">
             <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400"/> Crowdfunding
            </h3>
            <p className="text-sm text-gray-300 mb-4">Want to help make this event even bigger? Back the community crowdfund campaign.</p>
            <Link href={`/crowdfund/${event.id}`}>
              <Button variant="outline" className="w-full">View Campaign</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
