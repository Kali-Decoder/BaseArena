/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { usePrivyAuth } from "@/context/PrivyAuthProvider";
import { useUniversalWalletClient } from "@/hooks/useWalletClient";
import { Copy } from "lucide-react";
import toast from "react-hot-toast";
import { baseSepolia } from "viem/chains";
import { useSwitchChain } from "wagmi";



export default function LoginButton() {
  const { customizeLogin, logout, address, authenticated } = usePrivyAuth();
  const { chainId, getWalletClient } = useUniversalWalletClient();
  const shortAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "";

  const copyToClipboard = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast("Address Copied!", { className: "font-ropa", duration: 5000 });
    }
  };

  const handleSwitchChain = async () => {
    try {
      const walletClient = await getWalletClient();
      await walletClient.switchChain({ id: baseSepolia.id });
      toast.success("Switched to base Sepolia network");
    } catch(E: any) {
      console.error("Failed to switch chain. Please switch manually.", E);
      toast.error("Failed to switch chain. Please switch manually.");
    }
  };

  const isBaseSepolia = chainId === baseSepolia.id;

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {authenticated && address ? (
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={copyToClipboard}
              className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 font-ropa flex items-center text-white dark:text-gray-900 px-4 py-3 font-medium text-sm rounded-lg transition-colors duration-200 shadow-md"
            >
              <span>{shortAddress}</span>
              <Copy className="h-4 w-4 ml-2" />
            </button>

            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 font-ropa text-white px-4 py-3 font-medium text-sm rounded-lg transition-colors duration-200 shadow-md"
            >
              Logout
            </button>
          </div>

          {!isBaseSepolia && (
            <button
              onClick={handleSwitchChain}
              className="bg-amber-500 hover:bg-amber-600 font-ropa text-gray-900 px-4 py-3 font-medium text-sm rounded-lg transition-colors duration-200 shadow-md"
            >
              Switch to Base Sepolia
            </button>
          )}
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 font-ropa">
            Connect Your Wallet
          </h2>
          <button
            onClick={customizeLogin}
            className="bg-blue-600 hover:bg-blue-700 font-ropa text-white px-8 py-3 font-medium text-base rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Connect Wallet
          </button>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-ropa">
            Connect with Google, Twitter, Email, or Passkey
          </p>
        </div>
      )}
    </div>
  );
}
