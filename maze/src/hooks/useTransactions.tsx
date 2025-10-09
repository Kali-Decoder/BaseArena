import { GAME_CONTRACT_ADDRESS,GAME_ABI } from "@/constant";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";
import { useUniversalWalletClient } from "./useWalletClient";
import { toast } from "sonner";
import {
    createWalletClient,
    custom,
    encodeFunctionData,
    formatEther,
    Hex,
    parseEther,
    parseGwei,
} from "viem";
import { waitForTransactionReceipt } from "viem/actions";
import { monadTestnet } from "viem/chains";
export function useTransaction() {
const {getWalletClient} = useUniversalWalletClient();
  const { user } = usePrivy();
  const publicClient = getWalletClient();

  async function playMove() {
    if (!publicClient) throw new Error("Wallet not ready");
    const address = user?.wallet?.address;
    if (!address) throw new Error("No user address");
    let txHash;
    try {
      // Send transaction
      txHash = await publicClient.sendTransaction({
        account: address,
        to: GAME_CONTRACT_ADDRESS,
        data: "0x2e64cec1", // playMove() selector
      });
      toast.info("Transaction sent", {
        description: `Hash: ${txHash}`,
        action: (
          <button
            className="outline outline-white px-2 py-1 rounded"
            onClick={() =>
              window.open(
                `https://testnet.monadexplorer.com/tx/${txHash}`,
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            View
          </button>
        ),
      });
      // Wait for confirmation
      const receipt = await waitForTransactionReceipt(publicClient, {
        hash: txHash,
      });
      if (receipt.status === "reverted") {
        toast.error("Transaction reverted", {
          description: `Hash: ${txHash}`,
        });
        throw new Error("Transaction reverted");
      }
      toast.success("Transaction confirmed", {
        description: `Hash: ${txHash}`,
        action: (
          <button
            className="outline outline-white px-2 py-1 rounded"
            onClick={() =>
              window.open(
                `https://testnet.monadexplorer.com/tx/${txHash}`,
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            View
          </button>
        ),
      });
    } catch (e) {
      toast.error("Failed to send transaction", {
        description: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  }

  async function getMoves(address: string) {
    if (!publicClient) throw new Error("Wallet not ready");
    const result = await publicClient?.readContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_ABI,
      functionName: "moves",
      args: [address],
    });
    return result;
  }

  return { playMove, getMoves };
}