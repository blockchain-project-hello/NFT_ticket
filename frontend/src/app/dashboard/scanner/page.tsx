"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Scan, CheckCircle2, XCircle, RefreshCw, Smartphone } from 'lucide-react';
import { verifyTicketAtGate } from '@/lib/api';

export default function ScannerPage() {
  const [payloadStr, setPayloadStr] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleManualScan = async () => {
    if (!payloadStr) return;
    
    try {
      setStatus('loading');
      const payload = JSON.parse(payloadStr);
      
      const res = await verifyTicketAtGate(payload);
      
      if (res.success) {
        setStatus('success');
        setMessage(res.message || 'Access Granted');
      } else {
        setStatus('error');
        setMessage(res.message || 'Access Denied');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Invalid QR Payload format');
    }
  };

  const resetScanner = () => {
    setStatus('idle');
    setPayloadStr('');
    setMessage('');
  };

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-2xl mb-10 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Gate Access Scanner</h1>
        <p className="text-gray-400">Scan fan QR codes to verify ticket ownership and grant entry.</p>
      </div>

      <div className="w-full max-w-md glass-card rounded-3xl p-8 shadow-2xl shadow-violet-500/10 flex flex-col items-center border border-white/10">
        
        {status === 'idle' && (
          <div className="w-full flex flex-col items-center">
            <div className="w-32 h-32 border-4 border-dashed border-violet-500/50 rounded-2xl flex items-center justify-center mb-6 bg-violet-500/10">
              <Scan className="w-12 h-12 text-violet-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-6">Ready to Scan</h3>
            
            <div className="w-full space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#121214] px-2 text-gray-500">Manual Override Test</span>
                </div>
              </div>
              
              <textarea 
                value={payloadStr}
                onChange={(e) => setPayloadStr(e.target.value)}
                placeholder='Paste QR JSON payload here...'
                className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-mono text-gray-300 focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />
              
              <Button 
                onClick={handleManualScan} 
                disabled={!payloadStr}
                className="w-full h-12 text-base font-semibold shadow-lg shadow-violet-500/20"
              >
                Simulate Scan
              </Button>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div className="py-12 flex flex-col items-center">
            <RefreshCw className="w-16 h-16 text-violet-400 animate-spin mb-6" />
            <h3 className="text-xl font-semibold text-white">Verifying Signature...</h3>
            <p className="text-gray-400 mt-2">Checking blockchain ownership</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-16 h-16 text-green-400" />
            </div>
            <h3 className="text-3xl font-bold text-green-400 mb-2">Access Granted</h3>
            <p className="text-gray-300 mb-8">{message}</p>
            <Button onClick={resetScanner} variant="outline" className="w-full h-12">
              Scan Next Fan
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-16 h-16 text-red-400" />
            </div>
            <h3 className="text-3xl font-bold text-red-400 mb-2">Access Denied</h3>
            <p className="text-gray-400 mb-8">{message}</p>
            <Button onClick={resetScanner} variant="outline" className="w-full h-12 border-red-500/30 hover:bg-red-500/10">
              Try Again
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
