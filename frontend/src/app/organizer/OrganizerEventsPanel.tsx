"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Calendar, MapPin, Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Event,
  getOrganizerEvents,
  organizerAuthorizationMessage,
} from '@/lib/api';

export function OrganizerEventsPanel() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [events, setEvents] = useState<Event[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const loadEvents = async () => {
    if (!address) return;
    setStatus('loading');
    setMessage('');
    try {
      const signature = await signMessageAsync({
        message: organizerAuthorizationMessage(address),
      });
      setEvents(await getOrganizerEvents(address, signature));
      setStatus('idle');
    } catch (error: any) {
      setStatus('error');
      setMessage(error?.response?.data?.detail || error?.message || 'Unable to load organizer events.');
    }
  };

  useEffect(() => {
    if (address) void loadEvents();
  }, [address]);

  if (!address) {
    return <p className="text-gray-400">Connect the organizer wallet to continue.</p>;
  }

  return (
    <section className="w-full max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm uppercase tracking-widest text-cyan-400">Organizer workspace</p>
          <h1 className="text-4xl font-bold text-white">My Events</h1>
          <p className="text-gray-400 mt-2">Only events owned by the connected organizer wallet appear here.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => void loadEvents()} disabled={status === 'loading'}>
            <RefreshCw className={status === 'loading' ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
            Refresh
          </Button>
          <Link href="/organizer/events/create">
            <Button><Plus className="w-4 h-4" /> Create Event</Button>
          </Link>
        </div>
      </div>

      {status === 'error' && <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{message}</div>}
      {status !== 'loading' && events.length === 0 && status !== 'error' && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-gray-400">No events have been created for this organizer wallet.</div>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {events.map((event) => (
          <article key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">{event.name}</h2>
                <p className="text-sm text-gray-400 mt-2 flex items-center gap-2"><Calendar className="w-4 h-4" />{new Date(event.event_date).toLocaleString()}</p>
                <p className="text-sm text-gray-400 mt-1 flex items-center gap-2"><MapPin className="w-4 h-4" />{event.venue || 'Venue not specified'}</p>
              </div>
              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-300">On-chain</span>
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-white/10 mt-6 pt-5 text-sm">
              <div><p className="text-gray-500">Supply</p><p className="text-white font-semibold">{event.total_supply}</p></div>
              <div><p className="text-gray-500">Sold</p><p className="text-white font-semibold">{event.tickets_minted}</p></div>
              <div><p className="text-gray-500">Available</p><p className="text-white font-semibold">{event.total_supply - event.tickets_minted}</p></div>
            </div>
            <div className="flex items-center justify-between mt-5">
              <span className="text-xs text-gray-500">Chain event #{event.blockchain_event_id}</span>
              <Link href={`/organizer/events/${event.id}`} className="text-sm text-cyan-300 hover:text-white">Manage</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
