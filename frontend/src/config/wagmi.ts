import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { metaMaskWallet } from '@rainbow-me/rainbowkit/wallets';
import { polygonAmoy, foundry } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '140737345bf758af97ff3263fcf886de';

export const config = getDefaultConfig({
  appName: 'NFT Ticketing',
  projectId,
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [metaMaskWallet],
    },
  ],
  chains: [foundry, polygonAmoy],
  ssr: true,
});
