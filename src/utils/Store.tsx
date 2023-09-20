"use client";

import React, { useContext, useEffect, useState, createContext } from "react";
import * as anchor from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { CustomProgram, IDL } from "./idl/customProgram";

interface StoreConfig {
  programClient: anchor.Program<CustomProgram> | null;
  getCustomPda: any;
  getCustomPdaWithFilter: any;
  signAndSendTransaction: (
    transaction: Transaction,
    partialSign?: boolean,
    signer?: Keypair | null
  ) => Promise<string | undefined>;
}

const StoreContext = createContext<StoreConfig>({
  programClient: null,
  getCustomPda: async () => {},
  getCustomPdaWithFilter: async () => {},
  signAndSendTransaction: async () => "",
});

export function StoreProvider({ children }: { children: any }) {
  const [programClient, setProgramClient] =
    useState<anchor.Program<CustomProgram> | null>(null);

  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  useEffect(() => {
    (async () => {
      try {
        if (!IDL) {
          throw "IDL File Required";
        }
        if (!process.env.NEXT_PUBLIC_PROGRAM_ID) {
          throw "ProgramID Required";
        }

        if (wallet) {
          const provider = new anchor.AnchorProvider(
            connection,
            wallet,
            anchor.AnchorProvider.defaultOptions()
          );
          anchor.setProvider(provider);
          const customProgram: anchor.Program<CustomProgram> =
            new anchor.Program<CustomProgram>(
              IDL as CustomProgram,
              process.env.PROGRAM_ID!,
              provider
            );
          setProgramClient(customProgram);
        } else {
          const customProgram: anchor.Program<CustomProgram> =
            new anchor.Program<CustomProgram>(
              IDL as CustomProgram,
              process.env.NEXT_PUBLIC_PROGRAM_ID!,
              { connection }
            );
          setProgramClient(customProgram);
        }
      } catch (err) {
        console.log(err);
      }
    })();
  }, [wallet]);

  const signAndSendTransaction = async (
    transaction: Transaction,
    partialSign = false,
    signer: Keypair | null = null
  ) => {
    if (wallet) {
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash("confirmed")
      ).blockhash;
      transaction.feePayer = wallet.publicKey;

      if (partialSign && signer) transaction.partialSign(signer);

      const signedTx = await wallet.signTransaction(transaction);
      const rawTransaction = signedTx.serialize();
      const txSig = await connection.sendRawTransaction(rawTransaction);
      return txSig;
    }
  };

  const getCustomPda = async (
    userPubkey: PublicKey,
    program = programClient!
  ) => {
    const [userInfo, _userInfoBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), userPubkey.toBuffer()],
      program.programId
    );
    try {
      const userInfoData = await program.account.userInfo.fetch(userInfo);
      return userInfoData;
    } catch (error) {
      return null;
    }
  };

  const getCustomPdaWithFilter = async (
    userPubkey: PublicKey,
    program = programClient
  ) => {
    const filter = [
      {
        memcmp: {
          offset: 8, //prepend for anchor's discriminator & tokenAccount
          bytes: userPubkey.toBase58(),
        },
      },
    ];
    return await program!.account.userStakeInfo.all(filter);
  };

  return (
    <StoreContext.Provider
      value={{
        programClient,
        getCustomPda,
        getCustomPdaWithFilter,
        signAndSendTransaction,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export const useStoreContext = () => {
  const context = useContext(StoreContext);

  return {
    programClient: context.programClient!,
    getCustomPda: context.getCustomPda,
    signAndSendTransaction: context.signAndSendTransaction,
  };
};
