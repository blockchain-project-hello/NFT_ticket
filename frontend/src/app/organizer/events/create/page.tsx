"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { decodeEventLog, parseEther } from 'viem';
import { useAccount, useChainId, usePublicClient, useSignMessage, useWriteContract } from 'wagmi';

import { Button } from '@/components/ui/button';
import { TICKET_NFT_ABI } from '@/config/abis';
import { createEventMetadata, organizerAuthorizationMessage } from '@/lib/api';

const ticketAddress = process.env.NEXT_PUBLIC_TICKET_CONTRACT_ADDRESS as `0x${string}`;

export default function CreateEventPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [form, setForm] = useState({
    name: '', description: '', date: '', time: '', venue: '', price: '0.01', supply: '100', imageUrl: '',
  });
  const [status, setStatus] = useState<'idle' | 'wallet' | 'confirming' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!address) { setStatus('error'); setMessage('Connect the organizer wallet first.'); return; }
    if (!ticketAddress || ticketAddress === '0x0000000000000000000000000000000000000000') { setStatus('error'); setMessage('Set NEXT_PUBLIC_TICKET_CONTRACT_ADDRESS before creating events.'); return; }

    try {
      setStatus('wallet');
      const eventDate = new Date(`${form.date}T${form.time}`).getTime();
      if (!Number.isFinite(eventDate)) throw new Error('Enter a valid event date and time.');
      const hash = await writeContractAsync({
        address: ticketAddress,
        abi: TICKET_NFT_ABI,
        functionName: 'createEvent',
        args: [form.name, parseEther(form.price), BigInt(form.supply), BigInt(Math.floor(eventDate / 1000))],
      });
      setTxHash(hash);
      setStatus('confirming');
      if (!publicClient) throw new Error('Blockchain client is unavailable.');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setStatus('saving');
      let blockchainEventId: bigint | undefined;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: TICKET_NFT_ABI, data: log.data, topics: log.topics });
          if (decoded.eventName === 'EventCreated') {
            blockchainEventId = (decoded.args as { eventId: bigint }).eventId;
            break;
          }
        } catch {
          // Ignore unrelated logs in the transaction receipt.
        }
      }
      if (!blockchainEventId) throw new Error('Confirmed transaction did not contain EventCreated.');
      const signature = await signMessageAsync({ message: organizerAuthorizationMessage(address) });
      await createEventMetadata({
        name: form.name,
        description: form.description || null,
        organizer_wallet: address,
        venue: form.venue || null,
        event_date: new Date(eventDate).toISOString(),
        base_price_wei: Number(parseEther(form.price)),
        total_supply: Number(form.supply),
        image_url: form.imageUrl || null,
        blockchain_event_id: Number(blockchainEventId),
        contract_address: ticketAddress,
        creation_tx_hash: hash,
      }, address, signature);
      setStatus('success');
      setMessage('Event created and saved.');
    } catch (error: any) {
      setStatus('error');
      setMessage(error?.shortMessage || error?.message || 'Event creation failed.');
    }
  };

  return (
    <main className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-3xl mx-auto w-full">
      <Link href="/organizer/events" className="text-sm text-cyan-300">Back to My Events</Link>
      <h1 className="text-4xl font-bold text-white mt-4">Create Event</h1>
      <p className="text-gray-400 mt-2">The event is created on Polygon first. Metadata is saved only after the transaction is confirmed.</p>
      <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
        {(['name', 'venue', 'date', 'time', 'price', 'supply', 'imageUrl'] as const).map((field) => (
          <label key={field} className="block text-sm text-gray-300">
            {field === 'imageUrl' ? 'Event image URL' : field === 'supply' ? 'Maximum ticket supply' : field === 'price' ? 'Ticket price (ETH)' : field[0].toUpperCase() + field.slice(1)}
            <input required={['name', 'date', 'time', 'price', 'supply'].includes(field)} type={field === 'date' ? 'date' : field === 'time' ? 'time' : field === 'price' || field === 'supply' ? 'number' : 'text'} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-white" />
          </label>
        ))}
        <label className="block text-sm text-gray-300">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-white min-h-28" /></label>
        <Button type="submit" disabled={status === 'wallet' || status === 'confirming' || status === 'saving'}>{status === 'wallet' ? 'Confirm in wallet...' : status === 'confirming' ? 'Waiting for confirmation...' : status === 'saving' ? 'Saving event...' : 'Create event on Polygon'}</Button>
        {txHash && <p className="text-sm text-gray-300">Transaction: <a className="text-cyan-300" href={`https://amoy.polygonscan.com/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash}</a></p>}
        <p className="text-sm text-gray-500">Network: {chainId === 80002 ? 'Polygon Amoy' : `Chain ${chainId}`}</p>
        {status === 'success' && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <p className="text-green-300">Event created and saved.</p>
            <Link href="/organizer/events" className="text-cyan-300 hover:text-white">View My Events</Link>
          </div>
        )}
        {status === 'error' && <p className="text-red-300">{message}</p>}
      </form>
    </main>
  );
}
