/* eslint-disable @typescript-eslint/no-explicit-any */
import { useWalletClient, useAccount, usePublicClient } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { createWalletClient, custom, WalletClient } from "viem";
import { baseSepolia } from "viem/chains";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WalletManagerService } from "@/services/WalletManager";
import { WalletType, WalletInfo, WalletError } from "@/types/wallet";

export function useUniversalWalletClient() {
  const { data: wagmiWalletClient } = useWalletClient();
  const { address: wagmiAddress, isConnected: isWagmiConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { user } = usePrivy();

  // Wallet manager state
  const [walletManager] = useState(() => WalletManagerService.getInstance());
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<WalletError | null>(null);

  // Prepare hooks for wallet manager
  const wagmiHooks = useMemo(() => ({
    address: wagmiAddress,
    isConnected: isWagmiConnected,
    chainId,
    walletClient: wagmiWalletClient,
    publicClient,
  }), [wagmiAddress, isWagmiConnected, chainId, wagmiWalletClient, publicClient]);

  const privyHooks = useMemo(() => ({
    user,
  }), [user]);

  // Initialize wallet manager
  useEffect(() => {
    walletManager.initialize(wagmiHooks, privyHooks, user);
    walletManager.refresh();
    
    const info = walletManager.getWalletInfo();
    setWalletInfo(info);
    setError(null);
  }, [walletManager, wagmiHooks, privyHooks, user]);

  const getWalletClient = useCallback(async (): Promise<WalletClient> => {
    try {
      setError(null);

      const activeWallet = walletManager.getActiveWallet();
      if (!activeWallet) {
        throw new Error('No active wallet found');
      }

      const info = walletManager.getWalletInfo();
      if (!info) {
        throw new Error('No wallet info available');
      }

      switch (info.type) {
        case WalletType.METAMASK:
          // Use wagmi wallet client if available
          if (wagmiWalletClient) {
            return wagmiWalletClient;
          }
          
          // Fallback: create wallet client from window.ethereum
          if (typeof window !== 'undefined' && (window as any).ethereum) {
            return createWalletClient({
              account: info.address,
              chain: baseSepolia,
              transport: custom((window as any).ethereum as any),
            });
          }
          
          throw new Error('MetaMask wallet client not available');

        case WalletType.PRIVY_EMBEDDED:
          // Get Privy wallet provider
          const privyWallet = user?.linkedAccounts?.find(
            (account: any) => account.type === "wallet" && 
            account.walletClientType === "privy" && 
            account.chainType === "ethereum"
          ) as any;
          
          if (!privyWallet) {
            throw new Error('Privy wallet not found');
          }

          const privyWalletObj = await (window as any).privy?.getWalletClient(privyWallet.address);
          const provider = await privyWalletObj?.getEthereumProvider();
          
          if (!provider) {
            throw new Error('Failed to get Privy wallet provider');
          }

          return createWalletClient({
            account: info.address,
            chain: baseSepolia,
            transport: custom(provider),
          });

        default:
          throw new Error(`Unsupported wallet type: ${info.type}`);
      }
    } catch (err) {
      const walletError = new Error(err instanceof Error ? err.message : 'Unknown error') as WalletError;
      walletError.code = 'UNKNOWN_ERROR' as any;
      setError(walletError);
      throw walletError;
    }
  }, [walletManager, wagmiWalletClient, publicClient, user]);

  return {
    getWalletClient,
    address: walletInfo?.address || null,
    walletType: walletInfo?.type || null,
    chainId: walletInfo?.chainId || null,
    isConnected: walletInfo?.isConnected || false,
    isPrivyWallet: walletInfo?.type === WalletType.PRIVY_EMBEDDED,
    isExternalWallet: walletInfo?.type === WalletType.METAMASK,
    error,
    clearError: () => setError(null),
    refresh: () => {
      walletManager.refresh();
      const info = walletManager.getWalletInfo();
      setWalletInfo(info);
    }
  };
}