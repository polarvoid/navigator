import BN from "bn.js";
import {
  AccountInfo,
  Connection,
  DataSizeFilter,
  GetProgramAccountsConfig,
  MemcmpFilter,
  PublicKey,
} from "@solana/web3.js";
import {
  RESERVE_LAYOUT,
  ORCA_STRATEGY_STATE_LAYOUT,
  RAYDIUM_STRATEGY_STATE_LAYOUT,
  RAYDIUM_POSITION_LAYOUT,
  ORCA_POSITION_LAYOUT,
  FARM_LAYOUT,
  FARMER_LAYOUT,
} from "./layouts";
import {
  LYF_ORCA_PROGRAM_ID,
  ADMIN,
  LFY_RAYDIUM_PROGRAM_ID,
  LENDING_MARKET,
  FRANCIUM_LENDING_PROGRAM_ID,
  FRANCIUM_LENDING_REWARD_PROGRAM_ID,
} from "./ids";
import { IInstanceFarm, IInstanceMoneyMarket, IObligationInfo, IReserveInfoWrapper, IFarmInfoWrapper } from "../types";
import { utils } from "..";
import * as types from ".";

let infos: IInstanceMoneyMarket & IInstanceFarm;

infos = class InstanceFrancium {
  static async getAllReserves(connection: Connection, marketId?: PublicKey): Promise<types.ReserveInfo[]> {
    const programIdMemcmp: MemcmpFilter = {
      memcmp: {
        offset: 10,
        bytes: LENDING_MARKET.toString(),
      },
    };
    const dataSizeFilters: DataSizeFilter = {
      dataSize: RESERVE_LAYOUT.span,
    };
    const filters = [programIdMemcmp, dataSizeFilters];
    const config: GetProgramAccountsConfig = { filters };

    const reserveAccounts = await connection.getProgramAccounts(FRANCIUM_LENDING_PROGRAM_ID, config);
    return reserveAccounts.map((account) => this.parseReserve(account.account.data, account.pubkey));
  }

  static async getAllReserveWrappers(
    connection: Connection,
    marketId?: PublicKey
  ): Promise<types.ReserveInfoWrapper[]> {
    let reserves = await this.getAllReserves(connection);
    return reserves.map((reserveInfo) => new ReserveInfoWrapper(reserveInfo));
  }

  static async getReserve(connection: Connection, reserveId: PublicKey): Promise<types.ReserveInfo> {
    let reserveAccount = (await connection.getAccountInfo(reserveId)) as AccountInfo<Buffer>;
    return this.parseReserve(reserveAccount.data, reserveId);
  }

  static parseReserve(data: Buffer, reserveId: PublicKey): types.ReserveInfo {
    let buffer = Buffer.from(data);
    let rawLending = RESERVE_LAYOUT.decode(buffer);

    let {
      version,
      last_updateSlot,
      last_updateStale,
      lendingMarket,
      liquidityMintPubkey,
      liquidityMint_decimals,
      liquiditySupplyPubkey,
      liquidityFeeReceiver,
      oracle,
      liquidity_available_amount,
      liquidity_borrowed_amount_wads,
      liquidity_cumulative_borrowRate_wads,
      liquidityMarketPrice,
      shareMintPubkey,
      shareMintTotalSupply,
      shareSupplyPubkey,
      creditMintPubkey,
      creditMintTotalSupply,
      creditSupplyPubkey,
      threshold_1,
      threshold_2,
      base_1,
      factor_1,
      base_2,
      factor_2,
      base_3,
      factor_3,
      interestReverseRate,
      accumulated_interestReverse,
    } = rawLending;

    return {
      tokenMint: liquidityMintPubkey,
      reserveId,
      tknAccount: liquiditySupplyPubkey,
      feeAccount: liquidityFeeReceiver,
      shareMint: shareMintPubkey,
      shareAccount: shareSupplyPubkey,
      creditMint: creditMintPubkey,
      creditAccount: creditSupplyPubkey,
      market: lendingMarket,
      decimal: new BN(liquidityMint_decimals),
      liquidityAvailableAmount: new BN(liquidity_available_amount),
      liquidityBorrowedAmount: new BN(liquidity_borrowed_amount_wads).div(new BN(`1${"".padEnd(18, "0")}`)),
      marketPrice: new BN(liquidityMarketPrice),
      shareMintTotalSupply: new BN(shareMintTotalSupply),
      creditMintTotalSupply: new BN(creditMintTotalSupply),
      interestReverseRate: new BN(interestReverseRate),
      accumulatedInterestReverse: new BN(accumulated_interestReverse),
      threshold1: new BN(threshold_1).toNumber(),
      threshold2: new BN(threshold_2).toNumber(),
      base1: new BN(base_1).toNumber(),
      factor1: new BN(factor_1).toNumber(),
      base2: new BN(base_2).toNumber(),
      factor2: new BN(factor_2).toNumber(),
      base3: new BN(base_3).toNumber(),
      factor3: new BN(factor_3).toNumber(),
    };
  }

  static async getAllObligations(connection: Connection, userKey: PublicKey): Promise<IObligationInfo[]> {
    return [];
  }

  static async getObligation(
    connection: Connection,
    obligationId: PublicKey,
    version?: number
  ): Promise<types.ObligationInfo> {
    let obligationInfo = await connection.getAccountInfo(obligationId);
    return this.parseObligation(obligationInfo?.data, obligationId);
  }

  static parseObligation(data: Buffer | undefined, obligationId: PublicKey): IObligationInfo {
    return {} as IObligationInfo;
  }

  static async getAllFarms(connection: Connection, rewardMint?: PublicKey): Promise<types.FarmInfo[]> {
    const dataSizeFilters: DataSizeFilter = {
      dataSize: FARM_LAYOUT.span,
    };
    const filters = [dataSizeFilters];
    const config: GetProgramAccountsConfig = { filters };
    const farmAccounts = await connection.getProgramAccounts(FRANCIUM_LENDING_REWARD_PROGRAM_ID, config);
    const currentSlot = new BN(await connection.getSlot());

    let farms: types.FarmInfo[] = [];
    farmAccounts.map((account) => {
      let info = this.parseFarm(account.account.data, account.pubkey);
      if (info.rewardsEndSlot.cmp(currentSlot) || info.rewardsEndSlotB.cmp(currentSlot)) {
        farms.push(info);
      }
    });

    return farms;
  }

  static async getAllFarmWrappers(connection: Connection, rewardMint?: PublicKey): Promise<FarmInfoWrapper[]> {
    const farms = await this.getAllFarms(connection);
    return farms.map((farm) => new FarmInfoWrapper(farm));
  }

  static async getFarm(connection: Connection, farmId: PublicKey): Promise<types.FarmInfo> {
    let farmAccount = (await connection.getAccountInfo(farmId)) as AccountInfo<Buffer>;
    return this.parseFarm(farmAccount.data, farmId);
  }

  static parseFarm(data: Buffer, farmId: PublicKey): types.FarmInfo {
    let buffer = Buffer.from(data);
    let rawFarm = FARM_LAYOUT.decode(buffer);
    let {
      version,
      is_dual_rewards,
      admin,
      token_program_id,
      pool_authority,
      staked_token_mint,
      staked_token_account,
      rewards_token_mint,
      rewards_token_account,
      rewards_token_mint_b,
      rewards_token_account_b,
      pool_stake_cap,
      user_stake_cap,
      rewards_start_slot,
      rewards_end_slot,
      rewards_per_day,
      rewards_start_slot_b,
      rewards_end_slot_b,
      rewards_per_day_b,
      total_staked_amount,
      last_update_slot,
      accumulated_rewards_per_share,
      accumulated_rewards_per_share_b,
    } = rawFarm;

    return {
      farmId,
      version: new BN(version),
      isDualRewards: new BN(is_dual_rewards),
      admin: admin,
      tokenProgramId: token_program_id,
      poolAuthority: pool_authority,
      stakedTokenMint: staked_token_mint,
      stakedTokenAccount: staked_token_account,
      rewardsTokenMint: rewards_token_mint,
      rewardsTokenAccount: rewards_token_account,
      rewardsTokenMintB: rewards_token_mint_b,
      rewardsTokenAccountB: rewards_token_account_b,
      poolStakeCap: new BN(pool_stake_cap),
      userStakeCap: new BN(user_stake_cap),
      rewardsStartSlot: new BN(rewards_start_slot),
      rewardsEndSlot: new BN(rewards_end_slot),
      rewardsPerDay: new BN(rewards_per_day),
      rewardsStartSlotB: new BN(rewards_start_slot_b),
      rewardsEndSlotB: new BN(rewards_end_slot_b),
      rewardsPerDayB: new BN(rewards_per_day_b),
      totalStakedAmount: new BN(total_staked_amount),
      lastUpdateSlot: new BN(last_update_slot),
      accumulatedRewardsPerShare: new BN(accumulated_rewards_per_share),
      accumulatedRewardsPerShareB: new BN(accumulated_rewards_per_share_b),
    };
  }

  static async getAllFarmers(connection: Connection, userKey: PublicKey): Promise<types.FarmerInfo[]> {
    return [];
  }

  static async getFarmerId(farmId: PublicKey, userKey: PublicKey, version?: number): Promise<PublicKey> {
    // const ata = await utils.findAssociatedTokenAddress(userKey, farmInfo.stakedTokenMint);
    // const [farmInfoPub, nonce] = await PublicKey.findProgramAddress(
    //   [userKey.toBuffer(), farmId.toBuffer(), ata.toBuffer()],
    //   FRANCIUM_LENDING_REWARD_PROGRAM_ID
    // );
    // return { pda: farmInfoPub, bump: nonce };
    return PublicKey.default;
  }

  static async getFarmer(connection: Connection, farmerId: PublicKey, version?: number): Promise<types.FarmerInfo> {
    let data = (await connection.getAccountInfo(farmerId)) as AccountInfo<Buffer>;
    return await this._parseFarmerInfo(data.data, farmerId);
  }

  private static _parseFarmerInfo(data: Buffer, farmerId: PublicKey): types.FarmerInfo {
    let buffer = Buffer.from(data);
    let rawFarm = FARMER_LAYOUT.decode(buffer);
    let {
      version,
      staked_amount,
      rewards_debt,
      rewards_debt_b,
      farming_pool,
      user_main,
      stake_token_account,
      rewards_token_account,
      rewards_token_account_b,
    } = rawFarm;

    return {
      farmerId,
      userKey: user_main,
      farmId: farming_pool,
      amount: Number(new BN(staked_amount)),
      version: new BN(version),
      rewardsDebt: new BN(rewards_debt),
      rewardsDebtB: new BN(rewards_debt_b),
      stakeTokenAccount: stake_token_account,
      rewardsTokenAccount: rewards_token_account,
      rewardsTokenAccountB: rewards_token_account_b,
    };
  }
};

export { infos };

export class ReserveInfoWrapper implements IReserveInfoWrapper {
  constructor(public reserveInfo: types.ReserveInfo) {}

  supplyTokenMint() {
    return this.reserveInfo.tokenMint;
  }

  supplyTokenDecimal() {
    return this.reserveInfo.decimal;
  }

  reserveTokenMint() {
    return this.reserveInfo.shareMint;
  }

  reserveTokenDecimal() {
    return this.reserveInfo.decimal;
  }

  reserveTokenSupply() {
    return this.reserveInfo.shareMintTotalSupply;
  }

  supplyAmount() {
    return this.reserveInfo.liquidityAvailableAmount.add(this.reserveInfo.liquidityBorrowedAmount);
  }

  borrowedAmount() {
    return this.reserveInfo.liquidityBorrowedAmount;
  }

  supplyApy() {
    return this.rates().apy;
  }

  rates() {
    const { threshold1, threshold2, base1, factor1, base2, factor2, base3, factor3 } = { ...this.reserveInfo };
    let borrowInterest = 0;
    let utilization = this.calculateUtilizationRatio();
    if (utilization > 0 && utilization <= threshold1 / 100) {
      borrowInterest = base1 / 100 + (factor1 / 100) * utilization;
    } else if (utilization > threshold1 / 100 && utilization <= threshold2 / 100) {
      borrowInterest = base2 / 100 + (factor2 / 100) * (utilization - threshold1 / 100);
    } else if (utilization > threshold2 / 100) {
      borrowInterest = base3 / 100 + (factor3 / 100) * (utilization - threshold2 / 100);
    }
    const apr = utilization * borrowInterest * 100;
    const apy = ((1 + apr / 100 / 365) ** 365 - 1) * 100;
    return {
      borrowInterest: borrowInterest * 100,
      apr,
      apy,
    };
  }

  calculateUtilizationRatio() {
    return (
      this.borrowedAmount()
        .muln(10 ** 6)
        .div(this.supplyAmount())
        .toNumber() /
      10 ** 6
    );
  }
}

export class FarmInfoWrapper implements IFarmInfoWrapper {
  constructor(public farmInfo: types.FarmInfo) {}
}

// export function parseFarmData(data: any, farmId: PublicKey): types.FarmInfo {
// let buffer = Buffer.from(data);
// let rawFarm = FARM_LAYOUT.decode(buffer);
// let {
//   version,
//   is_dual_rewards,
//   admin,
//   token_program_id,
//   pool_authority,
//   staked_token_mint,
//   staked_token_account,
//   rewards_token_mint,
//   rewards_token_account,
//   rewards_token_mint_b,
//   rewards_token_account_b,
//   pool_stake_cap,
//   user_stake_cap,
//   rewards_start_slot,
//   rewards_end_slot,
//   rewards_per_day,
//   rewards_start_slot_b,
//   rewards_end_slot_b,
//   rewards_per_day_b,
//   total_staked_amount,
//   last_update_slot,
//   accumulated_rewards_per_share,
//   accumulated_rewards_per_share_b,
// } = rawFarm;

// return {
//   farmId,
//   version: new BN(version),
//   isDualRewards: new BN(is_dual_rewards),
//   admin: admin,
//   tokenProgramId: token_program_id,
//   poolAuthority: pool_authority,
//   stakedTokenMint: staked_token_mint,
//   stakedTokenAccount: staked_token_account,
//   rewardsTokenMint: rewards_token_mint,
//   rewardsTokenAccount: rewards_token_account,
//   rewardsTokenMintB: rewards_token_mint_b,
//   rewardsTokenAccountB: rewards_token_account_b,
//   poolStakeCap: new BN(pool_stake_cap),
//   userStakeCap: new BN(user_stake_cap),
//   rewardsStartSlot: new BN(rewards_start_slot),
//   rewardsEndSlot: new BN(rewards_end_slot),
//   rewardsPerDay: new BN(rewards_per_day),
//   rewardsStartSlotB: new BN(rewards_start_slot_b),
//   rewardsEndSlotB: new BN(rewards_end_slot_b),
//   rewardsPerDayB: new BN(rewards_per_day_b),
//   totalStakedAmount: new BN(total_staked_amount),
//   lastUpdateSlot: new BN(last_update_slot),
//   accumulatedRewardsPerShare: new BN(accumulated_rewards_per_share),
//   accumulatedRewardsPerShareB: new BN(accumulated_rewards_per_share_b),
// };
// }

// export function parseFarmerData(data: any, farmerId: PublicKey): types.FarmerInfo {
// let buffer = Buffer.from(data);
// let rawFarm = FARMER_LAYOUT.decode(buffer);
// let {
//   version,
//   staked_amount,
//   rewards_debt,
//   rewards_debt_b,
//   farming_pool,
//   user_main,
//   stake_token_account,
//   rewards_token_account,
//   rewards_token_account_b,
// } = rawFarm;

// return {
//   farmerId,
//   userKey: user_main,
//   farmId: farming_pool,
//   amount: Number(new BN(staked_amount)),
//   version: new BN(version),
//   rewardsDebt: new BN(rewards_debt),
//   rewardsDebtB: new BN(rewards_debt_b),
//   stakeTokenAccount: stake_token_account,
//   rewardsTokenAccount: rewards_token_account,
//   rewardsTokenAccountB: rewards_token_account_b,
// };
// }

// export async function getAllFarms(connection: Connection) {
// const dataSizeFilters: DataSizeFilter = {
//   dataSize: FARM_LAYOUT.span,
// };
// const filters = [dataSizeFilters];
// const config: GetProgramAccountsConfig = { filters };

// const farmAccounts = await connection.getProgramAccounts(FRANCIUM_LENDING_REWARD_PROGRAM_ID, config);

// const currentSlot = new BN(await connection.getSlot());

// // TODO: Why use set instead of array?
// let farmMap: Map<String, types.FarmInfo> = new Map();

// for (let account of farmAccounts) {
//   let info = parseFarmData(account.account.data, account.pubkey);
//   if (info.rewardsEndSlot.cmp(currentSlot)) {
//     farmMap.set(info.stakedTokenMint.toString(), info);
//   } else if (info.rewardsEndSlotB.cmp(currentSlot)) {
//     farmMap.set(info.stakedTokenMint.toString(), info);
//   }
// }

// return farmMap;
// }

// export async function getFarm(connection: Connection, farmId: PublicKey): Promise<types.FarmInfo> {
// let farmAccount = (await connection.getAccountInfo(farmId)) as AccountInfo<Buffer>;

// return parseFarmData(farmAccount.data, farmId);
// }

export async function getFarmerPubkey(wallet: PublicKey, farmInfo: types.FarmInfo) {
  const ata = await utils.findAssociatedTokenAddress(wallet, farmInfo.stakedTokenMint);
  const [farmInfoPub, nonce] = await PublicKey.findProgramAddress(
    [wallet.toBuffer(), farmInfo.farmId.toBuffer(), ata.toBuffer()],
    FRANCIUM_LENDING_REWARD_PROGRAM_ID
  );
  return { pda: farmInfoPub, bump: nonce };
}

export async function checkFarmerCreated(wallet: PublicKey, farmInfo: types.FarmInfo, connection: Connection) {
  const { pda, bump } = await getFarmerPubkey(wallet, farmInfo);
  const farmerAccount = (await connection.getAccountInfo(pda)) as AccountInfo<Buffer>;
  return farmerAccount.data.length > 0;
}

export function parseRaydiumStrategyStateData(data: any, infoPubkey: PublicKey): types.RaydiumStrategyState {
  let bufferedData = Buffer.from(data).slice(8);
  let rawState = RAYDIUM_STRATEGY_STATE_LAYOUT.decode(bufferedData);

  let {
    protocolVersion,
    protocolSubVersion,
    lastUpdateSlot,
    totalLp,
    totalShares,
    totalBorrowed0,
    totalBorrowed1,
    pendingTkn0,
    pendingTkn1,
    pendingWithdrawLp,
    pendingRepay0,
    pendingRepay1,
    cumulatedBorrowRate0,
    cumulatedBorrowRate1,
    admin,
    authority,
    authorityNonce,
    tokenProgramId,
    tknAccount0,
    tknAccount1,
    lpAccount,
    rewardAccount,
    rewardAccountB,
    lendingProgramId,
    lendingPool0,
    strategyLendingCreditAccount0,
    lendingPool1,
    strategyLendingCreditAccount1,
    platformRewardsEnable,
    rewardsStartSlot,
    rewardsEndSlot,
    rewardsPerSlot,
    platformRewardsTknMint,
    platformRewardsTknAccount,
    accumulatedRewardsPerShare,
    maxLeverage,
    liquidateLine,
    compoundRewardsRate,
    ammProgramId,
    ammId,
    ammIdForRewards,
    ammIdForRewardsB,
    stakeProgramId,
    stakePoolId,
    stakePoolTkn,
  } = rawState;

  return {
    infoPubkey,
    protocolVersion,
    protocolSubVersion,
    lastUpdateSlot,
    totalLp,
    totalShares,
    totalBorrowed0,
    totalBorrowed1,
    pendingTkn0,
    pendingTkn1,
    pendingWithdrawLp,
    pendingRepay0,
    pendingRepay1,
    cumulatedBorrowRate0,
    cumulatedBorrowRate1,
    admin,
    authority,
    authorityNonce,
    tokenProgramId,
    tknAccount0,
    tknAccount1,
    lpAccount,
    rewardAccount,
    rewardAccountB,
    lendingProgramId,
    lendingPool0,
    strategyLendingCreditAccount0,
    lendingPool1,
    strategyLendingCreditAccount1,
    platformRewardsEnable,
    rewardsStartSlot,
    rewardsEndSlot,
    rewardsPerSlot,
    platformRewardsTknMint,
    platformRewardsTknAccount,
    accumulatedRewardsPerShare,
    maxLeverage,
    liquidateLine,
    compoundRewardsRate,
    ammProgramId,
    ammId,
    ammIdForRewards,
    ammIdForRewardsB,
    stakeProgramId,
    stakePoolId,
    stakePoolTkn,
  };
}

export function parseOrcaStrategyStateData(data: any, infoPubkey: PublicKey): types.OrcaStrategyState {
  let bufferedData = Buffer.from(data).slice(8);
  let rawState = ORCA_STRATEGY_STATE_LAYOUT.decode(bufferedData);

  let {
    protocolVersion,
    protocolSubVersion,
    lastUpdateSlot,
    totalLp,
    totalShares,
    totalBorrowed0,
    totalBorrowed1,
    pendingTkn0,
    pendingTkn1,
    pendingWithdrawLp,
    pendingRepay0,
    pendingRepay1,
    cumulatedBorrowRate0,
    cumulatedBorrowRate1,
    maxLeverage,
    liquidateLine,
    compoundRewardsRate,
    admin,
    authority,
    authorityNonce,
    franciumRewardsEnable,
    franciumRewardsStartSlot,
    franciumRewardsEndSlot,
    franciumRewardsPerSlot,
    franciumAccumulatedRewardsPerShare,
    franciumRewardsTknAccount,
    lendingProgramId,
    ammProgramId,
    stakeProgramId,
    tknAccount0,
    tknAccount1,
    lpTknAccount,
    rewardsTknAccount,
    farmTknAccount,
    lendingPool0,
    strategyLendingCreditAccount0,
    lendingPool1,
    strategyLendingCreditAccount1,
    doubleDipRewardsSwapPoolId,
    doubleDipStrategyRewardsTknAccount,
    swapPoolId,
    rewardsSwapPoolId,
    stakePoolFarmInfo,
    strategyFarmInfo,
    doubleDipFarmTknAccount,
    doubleDipStakePoolFarmInfo,
    doubleDipStrategyFarmInfo,
  } = rawState;

  return {
    infoPubkey,
    protocolVersion,
    protocolSubVersion,
    lastUpdateSlot,
    totalLp,
    totalShares,
    totalBorrowed0,
    totalBorrowed1,
    pendingTkn0,
    pendingTkn1,
    pendingWithdrawLp,
    pendingRepay0,
    pendingRepay1,
    cumulatedBorrowRate0,
    cumulatedBorrowRate1,
    maxLeverage,
    liquidateLine,
    compoundRewardsRate,
    admin,
    authority,
    authorityNonce,
    franciumRewardsEnable,
    franciumRewardsStartSlot,
    franciumRewardsEndSlot,
    franciumRewardsPerSlot,
    franciumAccumulatedRewardsPerShare,
    franciumRewardsTknAccount,
    lendingProgramId,
    ammProgramId,
    stakeProgramId,
    tknAccount0,
    tknAccount1,
    lpTknAccount,
    rewardsTknAccount,
    farmTknAccount,
    lendingPool0,
    strategyLendingCreditAccount0,
    lendingPool1,
    strategyLendingCreditAccount1,
    doubleDipRewardsSwapPoolId,
    doubleDipStrategyRewardsTknAccount,
    swapPoolId,
    rewardsSwapPoolId,
    stakePoolFarmInfo,
    strategyFarmInfo,
    doubleDipFarmTknAccount,
    doubleDipStakePoolFarmInfo,
    doubleDipStrategyFarmInfo,
  };
}

export async function getOrcaStrategyState(strategyStateKey: PublicKey, connection: Connection) {
  let accountInfo = await connection.getAccountInfo(strategyStateKey);
  return parseOrcaStrategyStateData(accountInfo?.data, strategyStateKey);
}

export async function getAllOrcaStrategyStates(connection: Connection): Promise<types.OrcaStrategyState[]> {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 125,
      bytes: ADMIN.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 967,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters };

  const allAccountInfos = await connection.getProgramAccounts(LYF_ORCA_PROGRAM_ID, config);

  return allAccountInfos.map((info) => parseOrcaStrategyStateData(info.account.data, info.pubkey));
}

export async function getRaydiumStrategyState(
  strategyStateKey: PublicKey,
  connection: Connection
): Promise<types.RaydiumStrategyState> {
  let accountInfo = await connection.getAccountInfo(strategyStateKey);
  return parseRaydiumStrategyStateData(accountInfo?.data, strategyStateKey);
}

export async function getAllRaydiumStrategyStates(connection: Connection): Promise<types.RaydiumStrategyState[]> {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 122,
      bytes: ADMIN.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 903,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters };

  const allAccountInfos = await connection.getProgramAccounts(LFY_RAYDIUM_PROGRAM_ID, config);

  return allAccountInfos.map((info) => parseRaydiumStrategyStateData(info.account.data, info.pubkey));
}

export function parseRaydiumPositionData(data: any, infoPubkey: PublicKey): types.RaydiumPosition {
  let bufferedData = Buffer.from(data).slice(8);
  let rawInfo = RAYDIUM_POSITION_LAYOUT.decode(bufferedData);

  let {
    version,
    lastUpdateSlot,
    strategyStateAccount,
    userMainAccount,
    pending0,
    pendingInvestFlag,
    stopLoss,
    tkn0,
    tkn1,
    borrowed0,
    borrowed1,
    principle0,
    principle1,
    investedLp,
    lpShares,
    pendingWithdrawLp,
    pendingRepay0,
    pendingRepay1,
    cumulatedBorrowRate0,
    cumulatedBorrowRate1,
    platformRewardsDebt,
    pendingWithdrawFlag,
    takeProfitLine,
  } = rawInfo;

  return {
    infoPubkey,
    version,
    lastUpdateSlot,
    strategyStateAccount,
    userMainAccount,
    pending0,
    pendingInvestFlag,
    stopLoss,
    tkn0,
    tkn1,
    borrowed0,
    borrowed1,
    principle0,
    principle1,
    investedLp,
    lpShares,
    pendingWithdrawLp,
    pendingRepay0,
    pendingRepay1,
    cumulatedBorrowRate0,
    cumulatedBorrowRate1,
    platformRewardsDebt,
    pendingWithdrawFlag,
    takeProfitLine,
  };
}

export async function getAllRaydiumPositions(
  wallet: PublicKey,
  connection: Connection
): Promise<types.RaydiumPosition[]> {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 49,
      bytes: wallet.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 285,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters };

  const allPositionInfos = await connection.getProgramAccounts(LFY_RAYDIUM_PROGRAM_ID, config);

  return allPositionInfos.map((info) => parseRaydiumPositionData(info.account.data, info.pubkey));
}

export async function getRaydiumPositionKeySet(
  wallet: PublicKey,
  strategyAccount: PublicKey
): Promise<{ address: PublicKey; nonce: BN; bump: BN }> {
  let seed = Buffer.from([97, 110, 99, 104, 111, 114]);
  let nonce = Math.trunc(Date.now() / 1000);
  const nonceLeBytes = Buffer.from([0, 0, 0, 0]);
  nonceLeBytes.writeUInt32LE(nonce);

  const [pda, bump] = await PublicKey.findProgramAddress(
    [seed, wallet.toBuffer(), strategyAccount.toBuffer(), nonceLeBytes],
    LFY_RAYDIUM_PROGRAM_ID
  );

  return { address: pda, nonce: new BN(nonce), bump: new BN(bump) };
}

export function parseOrcaPositionData(data: any, infoPubkey: PublicKey): types.OrcaPosition {
  let bufferedData = Buffer.from(data).slice(8);
  let rawInfo = ORCA_POSITION_LAYOUT.decode(bufferedData);

  let {
    version,
    lastUpdateSlot,
    strategyStateAccount,
    userMainAccount,
    pending0,
    pendingInvestFlag,
    stopLoss,
    tkn0,
    tkn1,
    borrowed0,
    borrowed1,
    principle0,
    principle1,
    investedLp,
    lpShares,
    pendingWithdrawLp,
    pendingRepay0,
    pendingRepay1,
    cumulatedBorrowRate0,
    cumulatedBorrowRate1,
    platformRewardsDebt,
    pendingWithdrawFlag,
    takeProfitLine,
    stableSwapComputeFlag,
    stableSwapDirection,
    stableSwapAmount,
  } = rawInfo;

  return {
    infoPubkey,
    version,
    lastUpdateSlot,
    strategyStateAccount,
    userMainAccount,
    pending0,
    pendingInvestFlag,
    stopLoss,
    tkn0,
    tkn1,
    borrowed0,
    borrowed1,
    principle0,
    principle1,
    investedLp,
    lpShares,
    pendingWithdrawLp,
    pendingRepay0,
    pendingRepay1,
    cumulatedBorrowRate0,
    cumulatedBorrowRate1,
    platformRewardsDebt,
    pendingWithdrawFlag,
    takeProfitLine,
    stableSwapComputeFlag,
    stableSwapDirection,
    stableSwapAmount,
  };
}

export async function getAllOrcaPositions(wallet: PublicKey, connection: Connection): Promise<types.OrcaPosition[]> {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 49,
      bytes: wallet.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 285,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters };

  const allPositionInfos = await connection.getProgramAccounts(LYF_ORCA_PROGRAM_ID, config);

  return allPositionInfos.map((info) => parseOrcaPositionData(info.account.data, info.pubkey));
}
