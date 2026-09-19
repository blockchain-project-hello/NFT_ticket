"use client";

import { Button } from '../ui/button';
import { Tag, User } from 'lucide-react';

interface TicketCardProps {
  tokenId: number;
  eventId: number;
  eventName: string;
  seller: string;
  price: string;
  basePrice?: string;
  eventDate?: string;
  venue?: string | null;
  imageUrl?: string | null;
  status: string;
  onBuy?: () => void;
  isLoading?: boolean;
}

export function TicketCard({ tokenId, eventName, seller, price, basePrice, eventDate, venue, imageUrl, status, onBuy, isLoading }: TicketCardProps) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(139,92,246,0.3)]">
      <div className="h-40 bg-gradient-to-br from-gray-900 to-gray-800 relative flex items-center justify-center border-b border-white/5 overflow-hidden">
        {imageUrl && <img src={imageUrl} alt={eventName} className="absolute inset-0 h-full w-full object-cover opacity-45" />}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 text-center">
          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
            #{tokenId}
          </div>
          <div className="text-sm text-gray-500 mt-2 tracking-widest uppercase">VIP Pass</div>
        </div>
        <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-cyan-400 border border-white/10">
          {status}
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="font-semibold text-lg text-white mb-4 line-clamp-1">{eventName}</h3>
        
        <div className="space-y-3 mb-6">
          {eventDate && <div className="text-sm text-gray-400">Date: {new Date(eventDate).toLocaleString()}</div>}
          {venue && <div className="text-sm text-gray-400">Venue: {venue}</div>}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 flex items-center gap-2"><User className="w-4 h-4"/> Seller</span>
            <span className="text-gray-200 font-mono">{seller}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 flex items-center gap-2"><Tag className="w-4 h-4"/> Price</span>
            <span className="text-violet-400 font-bold">{price} ETH</span>
          </div>
          {basePrice && <div className="text-xs text-gray-500">Original price: {basePrice} ETH</div>}
        </div>
        
        <Button 
          variant="primary" 
          className="w-full" 
          onClick={onBuy}
          isLoading={isLoading}
        >
          Buy Ticket
        </Button>
      </div>
    </div>
  );
}
