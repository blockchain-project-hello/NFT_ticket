"use client";

import { useAccount, useSwitchChain, useChainId } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Button, ButtonProps } from '../ui/button';
import { polygonAmoy } from 'wagmi/chains';
import { Check } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TransactionButtonProps extends ButtonProps {
  label: string;
  onClick: () => void | Promise<void>;
  isSuccess?: boolean;
}

export function TransactionButton({ 
  label, 
  onClick, 
  disabled, 
  isLoading,
  isSuccess,
  variant = 'primary',
  ...props 
}: TransactionButtonProps) {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isSuccess) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  if (!isConnected) {
    return (
      <Button 
        variant="secondary" 
        onClick={openConnectModal}
        {...props}
      >
        Connect Wallet
      </Button>
    );
  }

  if (chainId !== polygonAmoy.id) {
    return (
      <Button 
        variant="destructive"
        onClick={() => switchChain({ chainId: polygonAmoy.id })}
        {...props}
      >
        Switch to Polygon Amoy
      </Button>
    );
  }

  return (
    <Button 
      variant={showSuccess ? 'secondary' : variant}
      onClick={onClick}
      disabled={disabled || isLoading || showSuccess}
      isLoading={isLoading}
      {...props}
    >
      {showSuccess ? (
        <span className="flex items-center text-green-400">
          <Check className="w-4 h-4 mr-2" /> Success
        </span>
      ) : (
        isLoading ? 'Confirming...' : label
      )}
    </Button>
  );
}
