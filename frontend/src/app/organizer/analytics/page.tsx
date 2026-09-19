"use client";

import Link from 'next/link';
import { BarChart3, ScanLine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { KPICard } from '@/components/features/KPICard';

export default function OrganizerAnalyticsPage() {
  return (
    <main className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-cyan-400">Organizer workspace</p>
          <h1 className="mt-2 text-4xl font-bold text-white">Analytics</h1>
          <p className="mt-2 text-gray-400">Review the current organizer performance snapshot.</p>
        </div>
        <Link href="/dashboard/scanner">
          <Button variant="outline"><ScanLine className="h-4 w-4" /> Open scanner</Button>
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Gross Sales" value="24.5k ETH" icon={BarChart3} trend={12.5} />
        <KPICard title="Royalties Earned" value="1.2k ETH" icon={BarChart3} trend={8.2} />
        <KPICard title="Resale Volume" value="15.8k ETH" icon={BarChart3} trend={-2.4} />
        <KPICard title="Active Tickets" value="3,450" icon={BarChart3} trend={4.1} />
      </div>
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-600" />
        <p className="mt-4 text-gray-400">Detailed chart data is not connected yet.</p>
      </div>
    </main>
  );
}