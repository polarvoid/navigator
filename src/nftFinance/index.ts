import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { INFTFarmInfo, INFTFarmerInfo, INFTPoolInfo, INFTRarityInfo, INFTLockerInfo } from "../types";

export * from "./ids";
export * from "./infos";
export * from "./layout";
export * from "./utils";

export interface NFTRarityInfo extends INFTRarityInfo {
  admin: PublicKey;
  collection: string;
  rarity: string;
  mintList: PublicKey[];
}

export interface NFTPoolInfo extends INFTPoolInfo {
  admin: PublicKey;
  rarityInfo: PublicKey;
  proveTokenAuthority: PublicKey;
  proveTokenVault: PublicKey;
  totalStakedAmount: BN;
}

export interface NFTFarmInfo extends INFTFarmInfo {
  admin: PublicKey;
  proveTokenMint: PublicKey;
  rewardTokenPerSlot: BN;
  rewardVault: PublicKey;
  farmAuthority: PublicKey;
  farmAuthorityBump: BN;
  totalProveTokenDeposited: BN;
}

// NFTVault (deprecated)
export interface NFTLockerInfo extends INFTLockerInfo {
  // key => vaultId
  nftHolder: PublicKey; // user
  poolId: PublicKey;
  nftMint: PublicKey;
}

// Miner (deprecated)
export interface NFTFarmerInfo extends INFTFarmerInfo {
  // key => minerId
  // owner => userKey
  farmId: PublicKey;
  farmerVault: PublicKey; // minerVault
  lastUpdateSlot: BN;
  unclaimedAmount: BN;
  depositedAmount: BN;
  farmerBump: BN; // minerBump
}

// default objects
export const defaultRarityInfo: NFTRarityInfo = {
  rarityId: PublicKey.default,
  admin: PublicKey.default,
  collection: "",
  rarity: "",
  mintList: [],
};

export const defaultPoolInfo: NFTPoolInfo = {
  poolId: PublicKey.default,
  proveTokenMint: PublicKey.default,
  admin: PublicKey.default,
  rarityInfo: PublicKey.default,
  proveTokenAuthority: PublicKey.default,
  proveTokenVault: PublicKey.default,
  totalStakedAmount: new BN(0),
};

export const defaultFarmInfo: NFTFarmInfo = {
  farmId: PublicKey.default,
  farmTokenMint: PublicKey.default,
  rewardTokenMint: PublicKey.default,
  admin: PublicKey.default,
  proveTokenMint: PublicKey.default,
  rewardTokenPerSlot: new BN(0),
  rewardVault: PublicKey.default,
  farmAuthority: PublicKey.default,
  farmAuthorityBump: new BN(0),
  totalProveTokenDeposited: new BN(0),
};
