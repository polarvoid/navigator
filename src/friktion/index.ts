export * from "./ids";
export * from "./infos";
export * from "./layouts";
import { PublicKey } from "@solana/web3.js";
import { IDepositorInfo, IVaultInfo, IWithdrawerInfo } from "../types";
import BN from "bn.js";
export interface VaultInfo extends IVaultInfo {
  // vaultId
  admin: PublicKey;
  seed: PublicKey;
  transferWindow: BN;
  startTransferTime: BN;
  endTransferTime: BN;
  initialized: boolean;
  currOptionWasSettled: boolean;
  mustSwapPremiumToUnderlying: boolean;
  nextOptionWasSet: boolean;
  firstEverOptionWasSet: boolean;
  instantTransfersEnabled: boolean;
  prepareIsFinished: boolean;
  enterIsFinished: boolean;
  roundHasStarted: boolean;
  roundNumber: BN;
  totalUnderlyingPreEnter: BN;
  totalUnderlyingPostSettle: BN;
  totalVoltTokensPostSettle: BN;
  vaultAuthority: PublicKey;
  depositPool: PublicKey;
  premiumPool: PublicKey;
  optionPool: PublicKey;
  writerTokenPool: PublicKey;
  vaultMint: PublicKey; // shareMint
  underlyingAssetMint: PublicKey;
  quoteAssetMint: PublicKey;
  optionMint: PublicKey;
  writerTokenMint: PublicKey;
  optionMarket: PublicKey;
  vaultType: BN;
  underlyingAmountPerContract: BN;
  quoteAmountPerContract: BN;
  expirationUnixTimestamp: BN;
  expirationInterval: BN;
  upperBoundOtmStrikeFactor: BN;
  haveTakenWithdrawalFees: boolean;
  serumSpotMarket: PublicKey;
  openOrdersBump: number;
  openOrdersInitBump: number;
  ulOpenOrdersBump: number;
  ulOpenOrders: PublicKey;
  ulOpenOrdersInitialized: boolean;
  bumpAuthority: number;
  serumOrderSizeOptions: BN;
  individualCapacity: BN;
  serumOrderType: BN;
  serumLimit: number;
  serumSelfTradeBehavior: number;
  serumClientOrderId: BN;
  whitelistTokenMint: PublicKey;
  permissionedMarketPremiumMint: PublicKey;
  permissionedMarketPremiumPool: PublicKey;
  capacity: BN;
  roundInfos: RoundInfo[];
  extraData: ExtraVaultInfo;
}

export interface DepositorInfo extends IDepositorInfo {
  // depositorId
  // userKey
  initialized: boolean;
  roundNumber: BN;
  amount: BN;
}

export interface withdrawerInfo extends IWithdrawerInfo {
  // withdrawerId
  // userKey
  initialized: boolean;
  roundNumber: BN;
  amount: BN;
}
export interface ExtraVaultInfo {
  extraDataId: PublicKey;
  isWhitelisted: boolean;
  whitelist: PublicKey;
  isForDao: boolean;
  daoProgramId: PublicKey;
  depositMint: PublicKey;
  targetLeverage: BN;
  targetLeverageLenience: BN;
  exitEarlyRatio: BN;
  entropyProgramId: PublicKey;
  entropyGroup: PublicKey;
  entropyAccount: PublicKey;
  powerPerpMarket: PublicKey;
  haveResolvedDeposits: boolean;
  doneRebalancing: boolean;
  daoAuthority: PublicKey;
  serumProgramId: PublicKey;
  entropyCache: PublicKey;
  hedgingSpotPerpMarket: PublicKey;
  entropyMetadata: PublicKey;
  hedgingSpotMarket: PublicKey;
  auctionMetadata: PublicKey;
  extraKey10: PublicKey;
  extraKey11: PublicKey;
  extraKey12: PublicKey;
  extraKey13: PublicKey;
  extraKey14: PublicKey;
  unusedUintOne: BN;
  maxQuotePosChange: BN;
  targetHedgeLenience: BN;
  unusedUintFour: BN;
  unusedUintFive: BN;
  unusedUintSix: BN;
  unusedUint7: BN;
  unusedUint8: BN;
  unusedUint9: BN;
  useCustomFees: BN;
  performanceFeeBps: BN;
  withdrawalFeeBps: BN;
  turnOffDepositsAndWithdrawals: boolean;
  rebalanceIsReady: boolean;
  dovPerformanceFeesInUnderlyings: boolean;
  doneRebalancingPowerPerp: boolean;
  isHedgingOn: boolean;
  haveTakenPerformanceFees: boolean;
}

export interface RoundInfo {
  roundId: PublicKey;
  roundNumber: BN;
  underlyingFromPendingDeposits: BN;
  voltTokensFromPendingWithdrawals: BN;
  underlyingPreEnter: BN;
  underlyingPostSettle: BN;
  premiumFarmed: BN;
}
