"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

import { Button } from '@/components/ui/button';
import { Event, getEvent, organizerAuthorizationMessage, updateEventMetadata } from '@/lib/api';

export default function ManageEventPage({ params }: { params: { id: string } }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [status, setStatus] = useState('Loading event...');

  useEffect(() => {
    getEvent(params.id).then((value) => {
      setEvent(value);
      setName(value.name);
      setDescription(value.description || '');
      setVenue(value.venue || '');
      setStatus('');
    }).catch(() => setStatus('Event not found.'));
  }, [params.id]);

  const save = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!address) { setStatus('Connect the organizer wallet first.'); return; }
    try {
      const signature = await signMessageAsync({ message: organizerAuthorizationMessage(address) });
      const updated = await updateEventMetadata(params.id, { name, description, venue }, address, signature);
      setEvent(updated);
      setStatus('Event details saved.');
    } catch (error: any) {
      setStatus(error?.response?.data?.detail || error?.message || 'Unable to save event.');
    }
  };

  if (!event) return <main className="p-10 text-gray-300">{status}</main>;
  return (
    <main className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-3xl mx-auto w-full">
      <Link href="/organizer/events" className="text-sm text-cyan-300">Back to My Events</Link>
      <h1 className="text-4xl font-bold text-white mt-4">Manage Event</h1>
      <p className="text-gray-400 mt-2">On-chain supply and price are fixed by the confirmed contract event. These fields are off-chain metadata.</p>
      <form onSubmit={save} className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
        <label className="block text-sm text-gray-300">Name<input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-white" /></label>
        <label className="block text-sm text-gray-300">Venue<input value={venue} onChange={(e) => setVenue(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-white" /></label>
        <label className="block text-sm text-gray-300">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-white min-h-28" /></label>
        <Button type="submit">Save metadata</Button>
        {status && <p className="text-sm text-gray-300">{status}</p>}
      </form>
    </main>
  );
}
