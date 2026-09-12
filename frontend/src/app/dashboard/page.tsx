"use client";

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { KPICard } from '@/components/features/KPICard';
import { ChatDrawer } from '@/components/features/ChatDrawer';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Ticket, 
  Repeat, 
  BadgePercent, 
  MessageSquarePlus,
  BarChart3
} from 'lucide-react';

export default function Dashboard() {
  const { isConnected } = useAccount();
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
          <BarChart3 className="w-10 h-10 text-violet-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Organizer Dashboard</h1>
        <p className="text-gray-400 max-w-md mb-8">
          Connect your wallet to access event analytics, manage ticket dynamics, and talk to your AI event assistant.
        </p>
        <p className="text-sm text-gray-500">Use the connect button in the top right.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex">
      <div className="flex-1 p-6 md:p-10 pb-32 md:pb-10 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Overview</h1>
              <p className="text-gray-400">Welcome back! Here's how your events are performing.</p>
            </div>
            <Button 
              onClick={() => setIsChatOpen(true)}
              className="gap-2 shrink-0 shadow-lg shadow-violet-500/20"
            >
              <MessageSquarePlus className="w-5 h-5" /> Ask AI Assistant
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <KPICard title="Gross Sales" value="24.5k MATIC" icon={DollarSign} trend={12.5} />
            <KPICard title="Royalties Earned" value="1.2k MATIC" icon={BadgePercent} trend={8.2} />
            <KPICard title="Resale Volume" value="15.8k MATIC" icon={Repeat} trend={-2.4} />
            <KPICard title="Active Tickets" value="3,450" icon={Ticket} trend={4.1} />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card rounded-2xl p-6 min-h-[400px] flex flex-col">
              <h3 className="text-lg font-bold text-white mb-6">Sales Activity</h3>
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-white/5 rounded-xl bg-black/20">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Chart visualization goes here</p>
                  <p className="text-xs text-gray-600">Integrate Recharts or similar library</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Recent Transactions</h3>
              <div className="space-y-4">
                {[
                  { action: "Ticket Minted", event: "Neon Nights", price: "0.5 MATIC", time: "2 mins ago" },
                  { action: "Secondary Sale", event: "Web3 Summit", price: "1.2 MATIC", time: "15 mins ago" },
                  { action: "Royalty Received", event: "Web3 Summit", price: "0.12 MATIC", time: "15 mins ago" },
                  { action: "Campaign Backed", event: "VR Expo", price: "5.0 MATIC", time: "1 hour ago" },
                ].map((tx, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                    <div>
                      <div className="text-sm font-medium text-white">{tx.action}</div>
                      <div className="text-xs text-gray-400">{tx.event} • {tx.time}</div>
                    </div>
                    <div className="text-sm font-bold text-cyan-400">{tx.price}</div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-6 text-sm text-gray-400">View All History</Button>
            </div>
          </div>
        </div>
      </div>

      <ChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
