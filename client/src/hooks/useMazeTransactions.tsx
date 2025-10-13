/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback } from "react";
import { encodeFunctionData, Hex } from "viem";
import { waitForTransactionReceipt } from "viem/actions";
import { baseSepolia } from "viem/chains";
import { GAME_CONTRACT_ADDRESS_MAZE, GAME_ABI_MAZE } from "@/constant";
import { useUniversalWalletClient } from "@/hooks/useWalletClient";
import { toast } from "react-hot-toast";

export function useMazeTransactions() {
  const { getWalletClient, address } = useUniversalWalletClient();

  const playMove = useCallback(async () => {
    const client = await getWalletClient();
    if (!client) throw new Error("Wallet not ready");
    if (!address) throw new Error("No user address");
    const sender = address as Hex;

    const data = encodeFunctionData({
      abi: GAME_ABI_MAZE as any,
      functionName: "playMove",
      args: [],
    });

    console.log("useMazeTransactions.playMove -> sending", {
      account: sender,
      to: GAME_CONTRACT_ADDRESS_MAZE,
      chainId: (client as any).chain?.id,
    });

    try {
        
      const txHash = await client.sendTransaction({
        account: sender,
        to: GAME_CONTRACT_ADDRESS_MAZE as Hex,
        data,
        chain: baseSepolia,
      });

      console.log("playMove -> txHash", txHash);
      toast(`Transaction sent: ${txHash}`);

      const receipt = await waitForTransactionReceipt(client, { hash: txHash });
      console.log("playMove -> receipt", receipt);
      if (receipt.status === "reverted") {
        toast.error(`Transaction reverted: ${txHash}`);
        throw new Error("Transaction reverted");
      }
      toast.success(`Transaction confirmed: ${txHash}`);
      return txHash;
    } catch (err) {
      console.error("playMove failed", err);
      throw err;
    }
  }, [getWalletClient, address]);

  const getMoves = useCallback(
    async (userAddress: string) => {
      const client = await getWalletClient();
      if (!client) throw new Error("Wallet not ready");
      const result = await (client as any).readContract({
        address: GAME_CONTRACT_ADDRESS_MAZE as Hex,
        abi: GAME_ABI_MAZE as any,
        functionName: "moves",
        args: [userAddress as Hex],
        chain: baseSepolia,
      });
      return result as bigint;
    },
    [getWalletClient]
  );

  return { playMove, getMoves };
}


