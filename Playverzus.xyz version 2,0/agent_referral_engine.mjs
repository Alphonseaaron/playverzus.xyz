import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '.data');
const agentsFile = path.join(dataDir, 'field_agents.json');

/**
 * PLAYVERZUS TIERED PLATFORM RAKE & 2-TIER FIELD AGENT COMMISSION SCHEDULE
 * ------------------------------------------------------------------------
 * Designed so Playverzus ALWAYS locks 80%+ of collected platform rake first
 * for Cost of Production, Server/API Infrastructure, and Company Net Profit
 * BEFORE paying Tier 1 Lead Agents and Tier 2 Sub-Agents ("Under Their Wing").
 */
export const PLATFORM_FEE_AND_AGENT_SCHEDULE = {
  // 1. Differentiated Platform Rake by Game Mode & Stake Tier
  platformRakes: [
    {
      mode: 'DUEL_STARTER',
      label: '1v1 & Squad Duels — Starter Tier (KES 130 – 650 / $1 – $5)',
      totalRakePercent: 15.0,
      winnerPayoutPercent: 85.0,
      companyProductionFloorPercentOfPot: 12.0, // 80% of rake locked for company first
      maxAgentPoolPercentOfPot: 3.0,             // 20% of rake (2.25% Direct + 0.75% Lead Override)
    },
    {
      mode: 'DUEL_PRO',
      label: '1v1 & Squad Duels — Standard & Pro Tier (KES 1,300+ / $10+)',
      totalRakePercent: 12.5,
      winnerPayoutPercent: 87.5,
      companyProductionFloorPercentOfPot: 10.0, // 80% of rake locked for company first
      maxAgentPoolPercentOfPot: 2.5,             // 20% of rake (1.875% Direct + 0.625% Lead Override)
    },
    {
      mode: 'BLITZ_TIER_1',
      label: '5-Player Blitz Sit & Go — Tier 1 Starter (KES 325 / $2.50)',
      totalRakePercent: 16.0,
      winnerPayoutPercent: 84.0,
      companyProductionFloorPercentOfPot: 12.8,
      maxAgentPoolPercentOfPot: 3.2,
    },
    {
      mode: 'BLITZ_TIER_2',
      label: '5-Player Blitz Sit & Go — Tier 2 Challenger (KES 650 / $5.00)',
      totalRakePercent: 18.0,
      winnerPayoutPercent: 82.0,
      companyProductionFloorPercentOfPot: 14.4,
      maxAgentPoolPercentOfPot: 3.6,
    },
    {
      mode: 'BLITZ_TIER_3_4',
      label: '5-Player Blitz Sit & Go — Tier 3 & 4 Champion/Master (KES 1,300 – 3,250 / $10 – $25)',
      totalRakePercent: 20.0,
      winnerPayoutPercent: 80.0,
      companyProductionFloorPercentOfPot: 16.0,
      maxAgentPoolPercentOfPot: 4.0,
    },
    {
      mode: 'BLITZ_TIER_5',
      label: '5-Player Blitz Sit & Go — Tier 5 Grandmaster (KES 6,500 / $50.00)',
      totalRakePercent: 22.0,
      winnerPayoutPercent: 78.0,
      companyProductionFloorPercentOfPot: 17.6,
      maxAgentPoolPercentOfPot: 4.4,
    },
    {
      mode: 'TOURNAMENT_CUP',
      label: 'Scheduled Multi-Bracket Tournaments & Championships (8–64 Players)',
      totalRakePercent: 20.0,
      winnerPayoutPercent: 80.0,
      companyProductionFloorPercentOfPot: 16.0,
      maxAgentPoolPercentOfPot: 4.0,
    },
  ],

  // 2. Ground Force 2-Tier Commission Rules
  agentCommissionRules: {
    // First Deposit Activation Bonus (Unlocks ONLY after player deposits >= KES 300 AND completes 1st settled Cash Match)
    minQualifyingFirstDepositKes: 300,
    leadAgentDirectFirstDepositPercent: 5.0,    // Lead Agent brings player directly: 5.0% of 1st deposit (cap KES 150)
    subAgentDirectFirstDepositPercent: 3.5,     // Sub-Agent brings player directly: 3.5% of 1st deposit (cap KES 105)
    leadAgentWingOverrideFirstDepositPercent: 1.5, // Lead Agent override on Sub-Agent's player 1st deposit: 1.5% (cap KES 45)
    maxFirstDepositBonusTotalKes: 150,

    // Ongoing Gameplay Commission (% of Collected Platform Rake — Company ALWAYS keeps 80%–82% of rake first!)
    companyProtectedShareOfRakePercent: 80.0,   // 80% of all platform rake is locked for Cost of Production & Profit
    leadAgentDirectShareOfRakePercent: 18.0,    // Lead Agent direct player match: 18% of collected rake (Company keeps 82%)
    subAgentDirectShareOfRakePercent: 15.0,     // Sub-Agent direct player match: 15% of collected rake
    leadAgentWingOverrideShareOfRakePercent: 5.0, // Lead Agent override on Sub-Agent's player match: 5% of collected rake
  },
};

function defaultStore() {
  return {
    agents: [
      {
        id: 'ag_lead_nairobi_01',
        userId: 'user_ag_kevin',
        username: 'kevin_ground_lead',
        fullName: 'Kevin Otieno (Nairobi Lead)',
        email: 'kevin.agent@playverzus.xyz',
        phone: '+254712345678',
        region: 'Nairobi CBD & Universities',
        tier: 'LEAD_AGENT', // LEAD_AGENT | SUB_AGENT
        parentAgentId: null,
        parentAgentCode: null,
        parentAgentName: null,
        referralCode: 'PVZ-KE-KEVIN',
        wingInviteCode: 'WING-KE-KEVIN',
        status: 'ACTIVE',
        referredPlayersCount: 18,
        activatedDepositorsCount: 14,
        subAgentsCount: 2,
        grossPlayerDepositsKes: 24500,
        grossMatchPotVolumeKes: 92000,
        grossPlatformRakeGeneratedKes: 15640,
        firstDepositCommissionKes: 980,
        gameplayRakeCommissionKes: 2110,
        wingOverrideCommissionKes: 645,
        totalEarnedKes: 3735,
        totalPaidKes: 2000,
        pendingOwedKes: 1735,
        payoutRequested: true,
        lastPayoutRequestedAt: '2026-11-21T14:20:00Z',
        createdAt: '2026-11-01T09:00:00Z',
        referredPlayers: [
          {
            username: 'omondi_fc27',
            joinedAt: '2026-11-18',
            firstDepositKes: 1500,
            activatedFirstMatch: true,
            cashMatchesPlayed: 19,
            rakeGeneratedKes: 2850,
            agentCommissionKes: 588,
          },
          {
            username: 'shanice_codm',
            joinedAt: '2026-11-19',
            firstDepositKes: 1000,
            activatedFirstMatch: true,
            cashMatchesPlayed: 12,
            rakeGeneratedKes: 1920,
            agentCommissionKes: 395,
          },
          {
            username: 'dante_tekken',
            joinedAt: '2026-11-21',
            firstDepositKes: 500,
            activatedFirstMatch: true,
            cashMatchesPlayed: 6,
            rakeGeneratedKes: 780,
            agentCommissionKes: 165,
          },
        ],
        payoutHistory: [
          {
            id: 'SET-9001',
            amountKes: 2000,
            phone: '+254712345678',
            reference: 'MPESA-SJK82910Q',
            paidByAdmin: 'Super Admin',
            paidAt: '2026-11-15T16:40:00Z',
            status: 'SETTLED',
          },
        ],
      },
      {
        id: 'ag_sub_nairobi_02',
        userId: 'user_ag_brian',
        username: 'brian_kasarani',
        fullName: 'Brian Mwangi (Kasarani Sub-Agent)',
        email: 'brian.sub@playverzus.xyz',
        phone: '+254723987654',
        region: 'Kasarani & Thika Road Gaming Lounges',
        tier: 'SUB_AGENT',
        parentAgentId: 'ag_lead_nairobi_01',
        parentAgentCode: 'WING-KE-KEVIN',
        parentAgentName: 'Kevin Otieno (Nairobi Lead)',
        referralCode: 'PVZ-KE-BRIAN',
        wingInviteCode: 'WING-KE-BRIAN',
        status: 'ACTIVE',
        referredPlayersCount: 11,
        activatedDepositorsCount: 9,
        subAgentsCount: 0,
        grossPlayerDepositsKes: 13200,
        grossMatchPotVolumeKes: 48000,
        grossPlatformRakeGeneratedKes: 8160,
        firstDepositCommissionKes: 462,
        gameplayRakeCommissionKes: 1224,
        wingOverrideCommissionKes: 0,
        totalEarnedKes: 1686,
        totalPaidKes: 1000,
        pendingOwedKes: 686,
        payoutRequested: false,
        lastPayoutRequestedAt: null,
        createdAt: '2026-11-05T11:30:00Z',
        referredPlayers: [
          {
            username: 'kibe_ps5',
            joinedAt: '2026-11-19',
            firstDepositKes: 2000,
            activatedFirstMatch: true,
            cashMatchesPlayed: 14,
            rakeGeneratedKes: 2100,
            agentCommissionKes: 385,
          },
          {
            username: 'moraa_chess',
            joinedAt: '2026-11-20',
            firstDepositKes: 650,
            activatedFirstMatch: true,
            cashMatchesPlayed: 8,
            rakeGeneratedKes: 940,
            agentCommissionKes: 164,
          },
        ],
        payoutHistory: [
          {
            id: 'SET-9002',
            amountKes: 1000,
            phone: '+254723987654',
            reference: 'MPESA-SJL44192P',
            paidByAdmin: 'Super Admin',
            paidAt: '2026-11-17T12:15:00Z',
            status: 'SETTLED',
          },
        ],
      },
      {
        id: 'ag_sub_nairobi_03',
        userId: 'user_ag_faith',
        username: 'faith_westlands',
        fullName: 'Faith Wanjiku (Westlands Sub-Agent)',
        email: 'faith.sub@playverzus.xyz',
        phone: '+254734556677',
        region: 'Westlands & Campus Hostels',
        tier: 'SUB_AGENT',
        parentAgentId: 'ag_lead_nairobi_01',
        parentAgentCode: 'WING-KE-KEVIN',
        parentAgentName: 'Kevin Otieno (Nairobi Lead)',
        referralCode: 'PVZ-KE-FAITH',
        wingInviteCode: 'WING-KE-FAITH',
        status: 'ACTIVE',
        referredPlayersCount: 7,
        activatedDepositorsCount: 5,
        subAgentsCount: 0,
        grossPlayerDepositsKes: 6500,
        grossMatchPotVolumeKes: 22000,
        grossPlatformRakeGeneratedKes: 3740,
        firstDepositCommissionKes: 228,
        gameplayRakeCommissionKes: 561,
        wingOverrideCommissionKes: 0,
        totalEarnedKes: 789,
        totalPaidKes: 0,
        pendingOwedKes: 789,
        payoutRequested: true,
        lastPayoutRequestedAt: '2026-11-21T18:05:00Z',
        createdAt: '2026-11-10T14:00:00Z',
        referredPlayers: [
          {
            username: 'jay_val',
            joinedAt: '2026-11-20',
            firstDepositKes: 1300,
            activatedFirstMatch: true,
            cashMatchesPlayed: 9,
            rakeGeneratedKes: 1350,
            agentCommissionKes: 248,
          },
        ],
        payoutHistory: [],
      },
      {
        id: 'ag_lead_mombasa_01',
        userId: 'user_ag_hassan',
        username: 'hassan_coast_lead',
        fullName: 'Hassan Ali (Mombasa & Coast Lead)',
        email: 'hassan.agent@playverzus.xyz',
        phone: '+254745112233',
        region: 'Mombasa, Nyali & Bamburi',
        tier: 'LEAD_AGENT',
        parentAgentId: null,
        parentAgentCode: null,
        parentAgentName: null,
        referralCode: 'PVZ-KE-HASSAN',
        wingInviteCode: 'WING-KE-HASSAN',
        status: 'ACTIVE',
        referredPlayersCount: 12,
        activatedDepositorsCount: 10,
        subAgentsCount: 0,
        grossPlayerDepositsKes: 16800,
        grossMatchPotVolumeKes: 64000,
        grossPlatformRakeGeneratedKes: 10880,
        firstDepositCommissionKes: 720,
        gameplayRakeCommissionKes: 1958,
        wingOverrideCommissionKes: 0,
        totalEarnedKes: 2678,
        totalPaidKes: 1500,
        pendingOwedKes: 1178,
        payoutRequested: false,
        lastPayoutRequestedAt: null,
        createdAt: '2026-11-04T10:00:00Z',
        referredPlayers: [
          {
            username: 'swahili_sniper',
            joinedAt: '2026-11-17',
            firstDepositKes: 2600,
            activatedFirstMatch: true,
            cashMatchesPlayed: 21,
            rakeGeneratedKes: 3360,
            agentCommissionKes: 735,
          },
        ],
        payoutHistory: [
          {
            id: 'SET-9003',
            amountKes: 1500,
            phone: '+254745112233',
            reference: 'MPESA-SJM99104K',
            paidByAdmin: 'Super Admin',
            paidAt: '2026-11-18T17:10:00Z',
            status: 'SETTLED',
          },
        ],
      },
    ],
  };
}

export function loadAgentsStore() {
  try {
    if (fs.existsSync(agentsFile)) {
      const parsed = JSON.parse(fs.readFileSync(agentsFile, 'utf8'));
      if (Array.isArray(parsed?.agents) && parsed.agents.length > 0) {
        return parsed;
      }
    }
  } catch {}
  const initial = defaultStore();
  saveAgentsStore(initial);
  return initial;
}

export function saveAgentsStore(store) {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(agentsFile, JSON.stringify(store, null, 2), 'utf8');
  } catch {}
}

export function buildAgentsOverview() {
  const store = loadAgentsStore();
  const agents = store.agents || [];

  let totalReferredPlayers = 0;
  let totalActivatedDepositors = 0;
  let totalGrossDepositsKes = 0;
  let totalGrossMatchVolumeKes = 0;
  let totalPlatformRakeGeneratedKes = 0;
  let totalCommissionsEarnedKes = 0;
  let totalSettledPaidKes = 0;
  let totalPendingOwedKes = 0;
  let payoutRequestsCount = 0;

  for (const ag of agents) {
    ag.pendingOwedKes = Math.max(0, Math.round((ag.totalEarnedKes || 0) - (ag.totalPaidKes || 0)));
    const companyNetFromAgent = Math.max(
      0,
      Math.round((ag.grossPlatformRakeGeneratedKes || 0) - (ag.totalEarnedKes || 0)),
    );
    ag.companyNetRetainedKes = companyNetFromAgent;

    totalReferredPlayers += Number(ag.referredPlayersCount || 0);
    totalActivatedDepositors += Number(ag.activatedDepositorsCount || 0);
    totalGrossDepositsKes += Number(ag.grossPlayerDepositsKes || 0);
    totalGrossMatchVolumeKes += Number(ag.grossMatchPotVolumeKes || 0);
    totalPlatformRakeGeneratedKes += Number(ag.grossPlatformRakeGeneratedKes || 0);
    totalCommissionsEarnedKes += Number(ag.totalEarnedKes || 0);
    totalSettledPaidKes += Number(ag.totalPaidKes || 0);
    totalPendingOwedKes += Number(ag.pendingOwedKes || 0);
    if (ag.payoutRequested && ag.pendingOwedKes > 0) payoutRequestsCount++;
  }

  const companyNetProfitAfterAgentsKes = Math.max(
    0,
    totalPlatformRakeGeneratedKes - totalCommissionsEarnedKes,
  );

  return {
    schedule: PLATFORM_FEE_AND_AGENT_SCHEDULE,
    summary: {
      totalAgents: agents.length,
      leadAgentsCount: agents.filter((a) => a.tier === 'LEAD_AGENT').length,
      subAgentsCount: agents.filter((a) => a.tier === 'SUB_AGENT').length,
      totalReferredPlayers,
      totalActivatedDepositors,
      totalGrossDepositsKes,
      totalGrossMatchVolumeKes,
      totalPlatformRakeGeneratedKes,
      companyNetProfitAfterAgentsKes,
      companyRetentionPercentOfRake:
        totalPlatformRakeGeneratedKes > 0
          ? Math.round((companyNetProfitAfterAgentsKes / totalPlatformRakeGeneratedKes) * 1000) / 10
          : 82.0,
      totalCommissionsEarnedKes,
      totalSettledPaidKes,
      totalPendingOwedKes,
      payoutRequestsCount,
    },
    agents,
  };
}

export function registerFieldAgent(payload) {
  const store = loadAgentsStore();
  const fullName = String(payload.fullName || payload.username || 'Field Agent').trim();
  const username = String(payload.username || fullName.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();
  const email = String(payload.email || `${username}@playverzus.xyz`).trim();
  const phone = String(payload.phone || '+254700000000').trim();
  const region = String(payload.region || 'Nairobi').trim();
  const parentWingCode = String(payload.parentWingCode || '').trim().toUpperCase();

  // Check if agent already exists by email or username
  const existing = store.agents.find(
    (a) =>
      a.email.toLowerCase() === email.toLowerCase() ||
      a.username.toLowerCase() === username.toLowerCase(),
  );
  if (existing) {
    return existing;
  }

  let parentAgent = null;
  if (parentWingCode) {
    parentAgent = store.agents.find(
      (a) =>
        (a.wingInviteCode || '').toUpperCase() === parentWingCode ||
        (a.referralCode || '').toUpperCase() === parentWingCode,
    );
  }

  const cleanTag = username
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7) || `AG${Date.now().toString().slice(-4)}`;

  const newAgent = {
    id: `ag_${Date.now()}`,
    userId: String(payload.userId || `user_${Date.now()}`),
    username,
    fullName,
    email,
    phone,
    region,
    tier: parentAgent ? 'SUB_AGENT' : 'LEAD_AGENT',
    parentAgentId: parentAgent ? parentAgent.id : null,
    parentAgentCode: parentAgent ? parentAgent.wingInviteCode : null,
    parentAgentName: parentAgent ? parentAgent.fullName : null,
    referralCode: `PVZ-KE-${cleanTag}`,
    wingInviteCode: `WING-KE-${cleanTag}`,
    status: 'ACTIVE',
    referredPlayersCount: 0,
    activatedDepositorsCount: 0,
    subAgentsCount: 0,
    grossPlayerDepositsKes: 0,
    grossMatchPotVolumeKes: 0,
    grossPlatformRakeGeneratedKes: 0,
    firstDepositCommissionKes: 0,
    gameplayRakeCommissionKes: 0,
    wingOverrideCommissionKes: 0,
    totalEarnedKes: 0,
    totalPaidKes: 0,
    pendingOwedKes: 0,
    companyNetRetainedKes: 0,
    payoutRequested: false,
    lastPayoutRequestedAt: null,
    createdAt: new Date().toISOString(),
    referredPlayers: [],
    payoutHistory: [],
  };

  if (parentAgent) {
    parentAgent.subAgentsCount = Number(parentAgent.subAgentsCount || 0) + 1;
  }

  store.agents.unshift(newAgent);
  saveAgentsStore(store);
  return newAgent;
}

export function attributePlayerConversion(payload) {
  const store = loadAgentsStore();
  const code = String(payload.referralCode || '').trim().toUpperCase();
  const agent = store.agents.find(
    (a) =>
      (a.referralCode || '').toUpperCase() === code ||
      (a.id || '').toUpperCase() === code,
  );
  if (!agent) {
    throw new Error(`No active Field Agent found with code "${code}".`);
  }

  const playerUsername = String(payload.playerUsername || `player_${Date.now().toString().slice(-4)}`).trim();
  const firstDepositKes = Math.max(0, Math.round(Number(payload.firstDepositKes || 0)));
  const matchPotKes = Math.max(0, Math.round(Number(payload.matchPotKes || 0)));
  const mode = String(payload.mode || 'DUEL_STARTER').toUpperCase();

  // Determine Platform Rake % by mode
  const rakeRate =
    mode === 'DUEL_PRO'
      ? 0.125
      : mode === 'BLITZ_TIER_1'
        ? 0.16
        : mode === 'BLITZ_TIER_2'
          ? 0.18
          : mode === 'BLITZ_TIER_5'
            ? 0.22
            : mode.startsWith('BLITZ') || mode.startsWith('TOURNAMENT')
              ? 0.20
              : 0.15;

  const platformRakeKes = Math.round(matchPotKes * rakeRate);

  // First Deposit Bonus (Unlocked only when firstDepositKes >= 300 AND matchPotKes > 0)
  const isSubAgent = agent.tier === 'SUB_AGENT' && Boolean(agent.parentAgentId);
  let directFtdCommKes = 0;
  let parentFtdOverrideKes = 0;

  if (firstDepositKes >= 300 && matchPotKes > 0) {
    if (isSubAgent) {
      directFtdCommKes = Math.min(105, Math.round(firstDepositKes * 0.035));
      parentFtdOverrideKes = Math.min(45, Math.round(firstDepositKes * 0.015));
    } else {
      directFtdCommKes = Math.min(150, Math.round(firstDepositKes * 0.05));
    }
  }

  // Gameplay Rake Commission (80% of platformRakeKes is hard-locked for Company Production & Profit first!)
  let directRakeCommKes = 0;
  let parentRakeOverrideKes = 0;
  if (platformRakeKes > 0) {
    if (isSubAgent) {
      directRakeCommKes = Math.round(platformRakeKes * 0.15);
      parentRakeOverrideKes = Math.round(platformRakeKes * 0.05);
    } else {
      directRakeCommKes = Math.round(platformRakeKes * 0.18);
    }
  }

  // Update Direct Agent
  agent.referredPlayersCount = Number(agent.referredPlayersCount || 0) + 1;
  if (firstDepositKes >= 300) {
    agent.activatedDepositorsCount = Number(agent.activatedDepositorsCount || 0) + 1;
  }
  agent.grossPlayerDepositsKes = Number(agent.grossPlayerDepositsKes || 0) + firstDepositKes;
  agent.grossMatchPotVolumeKes = Number(agent.grossMatchPotVolumeKes || 0) + matchPotKes;
  agent.grossPlatformRakeGeneratedKes =
    Number(agent.grossPlatformRakeGeneratedKes || 0) + platformRakeKes;
  agent.firstDepositCommissionKes =
    Number(agent.firstDepositCommissionKes || 0) + directFtdCommKes;
  agent.gameplayRakeCommissionKes =
    Number(agent.gameplayRakeCommissionKes || 0) + directRakeCommKes;
  agent.totalEarnedKes =
    Number(agent.firstDepositCommissionKes || 0) +
    Number(agent.gameplayRakeCommissionKes || 0) +
    Number(agent.wingOverrideCommissionKes || 0);
  agent.pendingOwedKes = Math.max(0, agent.totalEarnedKes - Number(agent.totalPaidKes || 0));

  agent.referredPlayers = agent.referredPlayers || [];
  agent.referredPlayers.unshift({
    username: playerUsername,
    joinedAt: new Date().toISOString().slice(0, 10),
    firstDepositKes,
    activatedFirstMatch: matchPotKes > 0,
    cashMatchesPlayed: matchPotKes > 0 ? 1 : 0,
    rakeGeneratedKes: platformRakeKes,
    agentCommissionKes: directFtdCommKes + directRakeCommKes,
  });

  // Update Parent Lead Agent ("Under Their Wing" Override)
  let parentAgent = null;
  if (isSubAgent && agent.parentAgentId) {
    parentAgent = store.agents.find((a) => a.id === agent.parentAgentId);
    if (parentAgent) {
      const totalOverride = parentFtdOverrideKes + parentRakeOverrideKes;
      parentAgent.wingOverrideCommissionKes =
        Number(parentAgent.wingOverrideCommissionKes || 0) + totalOverride;
      parentAgent.totalEarnedKes =
        Number(parentAgent.firstDepositCommissionKes || 0) +
        Number(parentAgent.gameplayRakeCommissionKes || 0) +
        Number(parentAgent.wingOverrideCommissionKes || 0);
      parentAgent.pendingOwedKes = Math.max(
        0,
        parentAgent.totalEarnedKes - Number(parentAgent.totalPaidKes || 0),
      );
    }
  }

  saveAgentsStore(store);
  return {
    ok: true,
    agent,
    parentAgent,
    breakdown: {
      firstDepositKes,
      matchPotKes,
      platformRakeKes,
      companyNetRetainedKes: Math.max(
        0,
        platformRakeKes - (directRakeCommKes + parentRakeOverrideKes),
      ),
      directAgentEarnedKes: directFtdCommKes + directRakeCommKes,
      leadAgentOverrideEarnedKes: parentFtdOverrideKes + parentRakeOverrideKes,
    },
  };
}

export function settleAgentPayout(payload) {
  const store = loadAgentsStore();
  const agentId = String(payload.agentId || '').trim();
  const agent = store.agents.find((a) => a.id === agentId || a.referralCode === agentId);
  if (!agent) {
    throw new Error('Field Agent not found.');
  }

  const currentPending = Math.max(0, Math.round((agent.totalEarnedKes || 0) - (agent.totalPaidKes || 0)));
  if (currentPending <= 0) {
    throw new Error('This agent has KES 0 pending balance owed.');
  }

  const requestedAmount = payload.amountKes ? Math.round(Number(payload.amountKes)) : currentPending;
  const settledAmountKes = Math.min(currentPending, Math.max(1, requestedAmount));

  agent.totalPaidKes = Number(agent.totalPaidKes || 0) + settledAmountKes;
  agent.pendingOwedKes = Math.max(0, agent.totalEarnedKes - agent.totalPaidKes);
  agent.payoutRequested = false;

  const receipt = {
    id: `SET-${Date.now().toString().slice(-5)}`,
    amountKes: settledAmountKes,
    phone: String(payload.phone || agent.phone || '+254700000000'),
    reference: String(payload.reference || `MPESA-${Date.now().toString(36).toUpperCase()}`),
    paidByAdmin: String(payload.paidByAdmin || 'Admin Treasury'),
    paidAt: new Date().toISOString(),
    status: 'SETTLED',
  };

  agent.payoutHistory = agent.payoutHistory || [];
  agent.payoutHistory.unshift(receipt);
  saveAgentsStore(store);

  return {
    ok: true,
    agent,
    receipt,
    settledAmountKes,
    newPendingOwedKes: agent.pendingOwedKes,
  };
}

export function requestAgentPayout(payload) {
  const store = loadAgentsStore();
  const agentId = String(payload.agentId || '').trim();
  const agent = store.agents.find(
    (a) => a.id === agentId || a.referralCode === agentId || a.username === agentId,
  );
  if (!agent) {
    throw new Error('Field Agent not found.');
  }
  const pending = Math.max(0, Math.round((agent.totalEarnedKes || 0) - (agent.totalPaidKes || 0)));
  if (pending < 150) {
    throw new Error('Minimum agent commission payout request is KES 150.');
  }
  agent.payoutRequested = true;
  agent.lastPayoutRequestedAt = new Date().toISOString();
  if (payload.phone) agent.phone = String(payload.phone).trim();
  saveAgentsStore(store);
  return {
    ok: true,
    agent,
    message: `Payout request for KES ${pending} submitted to Admin Treasury.`,
  };
}
