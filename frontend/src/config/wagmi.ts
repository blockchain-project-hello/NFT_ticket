import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonAmoy } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

export const config = getDefaultConfig({
  appName: 'NFT Ticketing',
  projectId,
  chains: [polygonAmoy],
  ssr: true, // If your dApp uses server side rendering (SSR)
});
