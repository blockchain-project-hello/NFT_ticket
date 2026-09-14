"use client";

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Ticket, QrCode, X, RefreshCw } from 'lucide-react';

// Using a basic div styling to simulate QR code for now to avoid dependency issues, 
// since cuer had issues earlier. In a real app we'd use react-qr-code
const QRCodeDisplay = ({ payload }: { payload: string }) => {
  return (
    <div className="bg-white p-4 rounded-xl w-64 h-64 flex flex-col items-center justify-center text-center overflow-hidden">
      <QrCode className="w-32 h-32 text-black mb-2" />
      <p className="text-[10px] text-gray-500 break-all w-full leading-tight font-mono">
        {payload}
      </p>
    </div>
  );
};

export function FanDashboard() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [qrPayload, setQrPayload] = useState<string>("");
  const [isSigning, setIsSigning] = useState(false);

  // Mock tickets for the fan
  const myTickets = [
    { tokenId: 101, eventId: 1, eventName: "Neon Nights Music Festival", date: "2026-10-31", status: "Valid" },
    { tokenId: 405, eventId: 2, eventName: "Web3 Developer Summit", date: "2026-11-15", status: "Valid" },
  ];

  const handleGenerateQR = async (ticket: any) => {
    try {
      setIsSigning(true);
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `Access Event ${ticket.eventId} - Token ${ticket.tokenId} - Timestamp ${timestamp}`;
      
      const signature = await signMessageAsync({ message });
      
      const payload = {
        event_id: ticket.eventId.toString(),
        token_id: ticket.tokenId,
        timestamp,
        signature
      };
      
      setSelectedTicket(ticket);
      setQrPayload(JSON.stringify(payload));
    } catch (err) {
      console.error("Failed to sign message:", err);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">My Tickets</h1>
        <p className="text-gray-400">View your purchased tickets and generate access codes for entry.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myTickets.map((ticket, i) => (
          <div key={i} className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
                <Ticket className="w-6 h-6 text-violet-400" />
              </div>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">
                {ticket.status}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{ticket.eventName}</h3>
            <p className="text-sm text-gray-400 mb-6">{ticket.date} • Token #{ticket.tokenId}</p>
            
            <div className="mt-auto pt-4 border-t border-white/10">
              <Button 
                onClick={() => handleGenerateQR(ticket)}
                disabled={isSigning}
                className="w-full bg-white text-black hover:bg-gray-200"
              >
                {isSigning ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
                Show Access QR
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* QR Code Modal */}
      {selectedTicket && qrPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-sm rounded-3xl p-8 flex flex-col items-center relative border border-white/20 shadow-2xl shadow-violet-500/20">
            <button 
              onClick={() => {
                setSelectedTicket(null);
                setQrPayload("");
              }}
              className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            
            <h3 className="text-xl font-bold text-white mb-2 text-center">{selectedTicket.eventName}</h3>
            <p className="text-sm text-gray-400 mb-8">Show this QR code at the gate</p>
            
            <div className="bg-white p-2 rounded-2xl mb-8">
              <QRCodeDisplay payload={qrPayload} />
            </div>
            
            <p className="text-xs text-gray-500 text-center max-w-[250px]">
              This access code is dynamically secured and will expire in 5 minutes to prevent screenshots.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
