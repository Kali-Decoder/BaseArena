/* eslint-disable @typescript-eslint/no-explicit-any */
import { WalletType, WalletInfo, WalletCapabilities } from '@/types/wallet';

export class WalletDetector {
  private static instance: WalletDetector;
  
  public static getInstance(): WalletDetector {
    if (!WalletDetector.instance) {
      WalletDetector.instance = new WalletDetector();
    }
    return WalletDetector.instance;
  }

  /**
   * Detects the primary wallet type based on user's linked accounts and connection status
   */
  public detectPrimaryWallet(
    linkedAccounts: any[],
    wagmiConnected: boolean,
    wagmiAddress?: string
  ): WalletType {
    // Priority order: MetaMask > Privy Embedded > Others
    if (wagmiConnected && wagmiAddress) {
      return WalletType.METAMASK;
    }

    const privyWallet = linkedAccounts?.find(
      (account) => account.type === "wallet" && 
      account.walletClientType === "privy" && 
      account.chainType === "ethereum"
    );

    if (privyWallet) {
      return WalletType.PRIVY_EMBEDDED;
    }

    return WalletType.UNKNOWN;
  }

  /**
   * Gets wallet information for a specific wallet type
   */
  public getWalletInfo(
    walletType: WalletType,
    linkedAccounts: any[],
    wagmiAddress?: string,
    chainId?: number
  ): WalletInfo | null {
    switch (walletType) {
      case WalletType.METAMASK:
        if (!wagmiAddress) return null;
        return {
          address: wagmiAddress as `0x${string}`,
          type: WalletType.METAMASK,
          chainId: chainId || 1,
          isConnected: true,
        };

      case WalletType.PRIVY_EMBEDDED:
        const privyWallet = linkedAccounts?.find(
          (account) => account.type === "wallet" && 
          account.walletClientType === "privy" && 
          account.chainType === "ethereum"
        );
        
        if (!privyWallet) return null;
        return {
          address: privyWallet.address as `0x${string}`,
          type: WalletType.PRIVY_EMBEDDED,
          chainId: chainId || 1,
          isConnected: true,
        };

      default:
        return null;
    }
  }

  /**
   * Gets wallet capabilities for a specific wallet type
   */
  public getWalletCapabilities(walletType: WalletType): WalletCapabilities {
    const baseCapabilities: WalletCapabilities = {
      canSignMessage: true,
      canSignTypedData: true,
      canSendTransaction: true,
      canSwitchChain: false,
    };

    switch (walletType) {
      case WalletType.METAMASK:
        return {
          ...baseCapabilities,
          canSwitchChain: true,
        };

      case WalletType.PRIVY_EMBEDDED:
        return {
          ...baseCapabilities,
          canSwitchChain: false, // Privy handles chain switching internally
        };

      default:
        return {
          canSignMessage: false,
          canSignTypedData: false,
          canSendTransaction: false,
          canSwitchChain: false,
        };
    }
  }

  /**
   * Validates if a wallet address is valid Ethereum address
   */
  public isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validates if a wallet is properly connected and functional
   */
  public validateWalletConnection(
    walletInfo: WalletInfo,
    linkedAccounts: any[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!walletInfo.address) {
      errors.push('Wallet address is missing');
    } else if (!this.isValidAddress(walletInfo.address)) {
      errors.push('Invalid wallet address format');
    }

    if (!walletInfo.isConnected) {
      errors.push('Wallet is not connected');
    }

    if (walletInfo.type === WalletType.PRIVY_EMBEDDED) {
      const privyWallet = linkedAccounts?.find(
        (account) => account.type === "wallet" && 
        account.walletClientType === "privy" && 
        account.chainType === "ethereum"
      );
      
      if (!privyWallet) {
        errors.push('Privy embedded wallet not found in linked accounts');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Gets all available wallet types based on current state
   */
  public getAvailableWallets(
    linkedAccounts: any[],
    wagmiConnected: boolean
  ): WalletType[] {
    const available: WalletType[] = [];

    if (wagmiConnected) {
      available.push(WalletType.METAMASK);
    }

    const hasPrivyWallet = linkedAccounts?.some(
      (account) => account.type === "wallet" && 
      account.walletClientType === "privy" && 
      account.chainType === "ethereum"
    );

    if (hasPrivyWallet) {
      available.push(WalletType.PRIVY_EMBEDDED);
    }

    return available;
  }
}