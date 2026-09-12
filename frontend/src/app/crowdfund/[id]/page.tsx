"use client";

import { useState } from 'react';
import { TransactionButton } from '@/components/features/TransactionButton';
import { Clock, Target, Users, TrendingUp } from 'lucide-react';
import { useWriteContract } from 'wagmi';
import { ESCROW_ABI } from '@/config/abis';
import { parseEther } from 'viem';

export default function CrowdfundCampaign({ params }: { params: { id: string } }) {
  const [amount, setAmount] = useState('10');
  const contractAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS as `0x${string}`;
  
  const { writeContract, isPending, isSuccess } = useWriteContract();

  // Mock campaign data
  const campaign = {
    eventId: params.id,
    title: "Neon Nights - Stage Expansion",
    organizer: "0xOrgani...zer1",
    goal: 5000,
    funded: 3450,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    state: 'Active' // Active, Funded, Finalized, Cancelled
  };

  const progressPercentage = Math.min((campaign.funded / campaign.goal) * 100, 100);

  const handleBack = () => {
    try {
      writeContract({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName: 'backCampaign',
        args: [BigInt(1)], // Mock campaign ID
        value: parseEther(amount),
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 w-full">
      <div className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-sm font-bold text-violet-400 border-violet-500/20">
        <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
        Community Crowdfund
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Info Side */}
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
              {campaign.title}
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              Help us upgrade the main stage production. Funds are held in a secure escrow smart contract and will be fully refunded if our goal is not met by the deadline.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <Users className="w-6 h-6 text-cyan-400 mb-2" />
              <div className="text-2xl font-bold text-white">128</div>
              <div className="text-xs text-gray-500 uppercase">Backers</div>
            </div>
            <div className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <Clock className="w-6 h-6 text-violet-400 mb-2" />
              <div className="text-2xl font-bold text-white">5 Days</div>
              <div className="text-xs text-gray-500 uppercase">Remaining</div>
            </div>
          </div>
        </div>

        {/* Funding Side */}
        <div className="glass-card p-8 rounded-3xl relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl -z-10" />
          
          <div className="mb-8">
            <div className="flex justify-between items-end mb-4">
              <div>
                <div className="text-sm text-gray-400 font-medium mb-1 flex items-center gap-2">
                  <Target className="w-4 h-4"/> Goal: {campaign.goal} MATIC
                </div>
                <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
                  {campaign.funded} MATIC
                </div>
              </div>
              <div className="text-xl font-bold text-white">
                {progressPercentage.toFixed(1)}%
              </div>
            </div>
            
            <div className="w-full bg-gray-900 rounded-full h-6 border border-white/5 overflow-hidden p-1">
              <div 
                className="bg-gradient-to-r from-cyan-400 via-violet-500 to-purple-500 h-full rounded-full relative" 
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
              </div>
            </div>
          </div>

          <div className="bg-black/30 rounded-2xl p-6 border border-white/5 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4"/> Backing Amount (MATIC)
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-xl font-bold text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                  MATIC
                </div>
              </div>
            </div>

            <TransactionButton
              label="Back this Event"
              onClick={handleBack}
              isLoading={isPending}
              isSuccess={isSuccess}
              className="w-full h-14 text-lg font-bold shadow-lg shadow-cyan-500/25"
            />
            
            <p className="text-xs text-center text-gray-500 px-4">
              By backing, you agree to the smart contract terms. Funds are secured via decentralized escrow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
