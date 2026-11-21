import {
  Body,
  Controller,
  Get,
  NotFoundException,
  BadRequestException,
  Post,
  Query,
} from '@nestjs/common';

const PLATFORM_FEE_AND_AGENT_SCHEDULE = {
  platformRakes: [
    {
      mode: 'DUEL_STARTER',
      label: '1v1 & Squad Duels — Starter Tier (KES 130 – 650 / $1 – $5)',
      totalRakePercent: 15.0,
      winnerPayoutPercent: 85.0,
      companyProductionFloorPercentOfPot: 12.0,
      maxAgentPoolPercentOfPot: 3.0,
    },
    {
      mode: 'DUEL_PRO',
      label: '1v1 & Squad Duels — Standard & Pro Tier (KES 1,300+ / $10+)',
      totalRakePercent: 12.5,
      winnerPayoutPercent: 87.5,
      companyProductionFloorPercentOfPot: 10.0,
      maxAgentPoolPercentOfPot: 2.5,
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
  agentCommissionRules: {
    minQualifyingFirstDepositKes: 300,
    leadAgentDirectFirstDepositPercent: 5.0,
    subAgentDirectFirstDepositPercent: 3.5,
    leadAgentWingOverrideFirstDepositPercent: 1.5,
    maxFirstDepositBonusTotalKes: 150,
    companyProtectedShareOfRakePercent: 80.0,
    leadAgentDirectShareOfRakePercent: 18.0,
    subAgentDirectShareOfRakePercent: 15.0,
    leadAgentWingOverrideShareOfRakePercent: 5.0,
  },
};

@Controller('agents')
export class V2AgentsController {
  private readonly agents: any[] = [
    {
      id: 'ag_lead_nairobi_01',
      userId: 'user_ag_kevin',
      username: 'kevin_ground_lead',
      fullName: 'Kevin Otieno (Nairobi Lead)',
      email: 'kevin.agent@playverzus.xyz',
      phone: '+254712345678',
      region: 'Nairobi CBD & Universities',
      tier: 'LEAD_AGENT',
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
      referredPlayers: [],
      payoutHistory: [],
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
      referredPlayers: [],
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
      referredPlayers: [],
      payoutHistory: [],
    },
  ];

  private buildOverview() {
    let totalReferredPlayers = 0;
    let totalActivatedDepositors = 0;
    let totalGrossDepositsKes = 0;
    let totalGrossMatchVolumeKes = 0;
    let totalPlatformRakeGeneratedKes = 0;
    let totalCommissionsEarnedKes = 0;
    let totalSettledPaidKes = 0;
    let totalPendingOwedKes = 0;
    let payoutRequestsCount = 0;

    for (const ag of this.agents) {
      ag.pendingOwedKes = Math.max(0, Math.round((ag.totalEarnedKes || 0) - (ag.totalPaidKes || 0)));
      ag.companyNetRetainedKes = Math.max(
        0,
        Math.round((ag.grossPlatformRakeGeneratedKes || 0) - (ag.totalEarnedKes || 0)),
      );
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
        totalAgents: this.agents.length,
        leadAgentsCount: this.agents.filter((a) => a.tier === 'LEAD_AGENT').length,
        subAgentsCount: this.agents.filter((a) => a.tier === 'SUB_AGENT').length,
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
      agents: this.agents,
    };
  }

  @Get('overview')
  getOverview() {
    return this.buildOverview();
  }

  @Get('me')
  getMe(
    @Query('username') username?: string,
    @Query('email') email?: string,
    @Query('code') code?: string,
  ) {
    const overview = this.buildOverview();
    const qUser = (username || '').toLowerCase();
    const qEmail = (email || '').toLowerCase();
    const qCode = (code || '').toUpperCase();
    const found =
      overview.agents.find(
        (a) =>
          (qCode && a.referralCode.toUpperCase() === qCode) ||
          (qEmail && a.email.toLowerCase() === qEmail) ||
          (qUser && a.username.toLowerCase() === qUser),
      ) || overview.agents[0];
    const subAgents = overview.agents.filter((a) => a.parentAgentId === found?.id);
    return {
      agent: found,
      subAgents,
      schedule: overview.schedule,
    };
  }

  @Post('register')
  register(@Body() body: any) {
    const fullName = String(body?.fullName || body?.username || 'Field Agent').trim();
    const username = String(body?.username || fullName.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();
    const email = String(body?.email || `${username}@playverzus.xyz`).trim();
    const phone = String(body?.phone || '+254700000000').trim();
    const region = String(body?.region || 'Nairobi').trim();
    const parentWingCode = String(body?.parentWingCode || '').trim().toUpperCase();

    const parent = parentWingCode
      ? this.agents.find(
          (a) =>
            (a.wingInviteCode || '').toUpperCase() === parentWingCode ||
            (a.referralCode || '').toUpperCase() === parentWingCode,
        )
      : null;

    const cleanTag =
      username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7) ||
      `AG${Date.now().toString().slice(-4)}`;

    const created = {
      id: `ag_${Date.now()}`,
      userId: String(body?.userId || `user_${Date.now()}`),
      username,
      fullName,
      email,
      phone,
      region,
      tier: parent ? 'SUB_AGENT' : 'LEAD_AGENT',
      parentAgentId: parent ? parent.id : null,
      parentAgentCode: parent ? parent.wingInviteCode : null,
      parentAgentName: parent ? parent.fullName : null,
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
    if (parent) parent.subAgentsCount = Number(parent.subAgentsCount || 0) + 1;
    this.agents.unshift(created);
    return { ok: true, agent: created, overview: this.buildOverview() };
  }

  @Post('settle-payout')
  settlePayout(@Body() body: any) {
    const agentId = String(body?.agentId || '').trim();
    const agent = this.agents.find((a) => a.id === agentId || a.referralCode === agentId);
    if (!agent) throw new NotFoundException('Field Agent not found.');
    const currentPending = Math.max(0, Math.round((agent.totalEarnedKes || 0) - (agent.totalPaidKes || 0)));
    if (currentPending <= 0) {
      throw new BadRequestException('This agent has KES 0 pending balance owed.');
    }
    const settledAmountKes = Math.min(currentPending, Math.max(1, Number(body?.amountKes || currentPending)));
    agent.totalPaidKes = Number(agent.totalPaidKes || 0) + settledAmountKes;
    agent.pendingOwedKes = Math.max(0, agent.totalEarnedKes - agent.totalPaidKes);
    agent.payoutRequested = false;
    const receipt = {
      id: `SET-${Date.now().toString().slice(-5)}`,
      amountKes: settledAmountKes,
      phone: String(body?.phone || agent.phone),
      reference: String(body?.reference || `MPESA-${Date.now().toString(36).toUpperCase()}`),
      paidByAdmin: 'Admin Treasury',
      paidAt: new Date().toISOString(),
      status: 'SETTLED',
    };
    agent.payoutHistory = agent.payoutHistory || [];
    agent.payoutHistory.unshift(receipt);
    return { ok: true, agent, receipt, overview: this.buildOverview() };
  }

  @Post('request-payout')
  requestPayout(@Body() body: any) {
    const agentId = String(body?.agentId || '').trim();
    const agent = this.agents.find((a) => a.id === agentId || a.referralCode === agentId || a.username === agentId);
    if (!agent) throw new NotFoundException('Field Agent not found.');
    agent.payoutRequested = true;
    agent.lastPayoutRequestedAt = new Date().toISOString();
    return { ok: true, agent, overview: this.buildOverview() };
  }

  @Post('attribute')
  attribute(@Body() body: any) {
    const code = String(body?.referralCode || '').trim().toUpperCase();
    const agent = this.agents.find((a) => (a.referralCode || '').toUpperCase() === code || a.id === code);
    if (!agent) throw new NotFoundException('Field Agent not found.');
    const firstDepositKes = Math.max(0, Math.round(Number(body?.firstDepositKes || 0)));
    const matchPotKes = Math.max(0, Math.round(Number(body?.matchPotKes || 0)));
    const platformRakeKes = Math.round(matchPotKes * 0.16);
    const isSub = agent.tier === 'SUB_AGENT' && Boolean(agent.parentAgentId);
    const directFtd =
      firstDepositKes >= 300 && matchPotKes > 0
        ? Math.min(isSub ? 105 : 150, Math.round(firstDepositKes * (isSub ? 0.035 : 0.05)))
        : 0;
    const parentFtd =
      isSub && firstDepositKes >= 300 && matchPotKes > 0
        ? Math.min(45, Math.round(firstDepositKes * 0.015))
        : 0;
    const directRake = Math.round(platformRakeKes * (isSub ? 0.15 : 0.18));
    const parentRake = isSub ? Math.round(platformRakeKes * 0.05) : 0;

    agent.referredPlayersCount += 1;
    if (firstDepositKes >= 300) agent.activatedDepositorsCount += 1;
    agent.grossPlayerDepositsKes += firstDepositKes;
    agent.grossMatchPotVolumeKes += matchPotKes;
    agent.grossPlatformRakeGeneratedKes += platformRakeKes;
    agent.firstDepositCommissionKes += directFtd;
    agent.gameplayRakeCommissionKes += directRake;
    agent.totalEarnedKes =
      agent.firstDepositCommissionKes +
      agent.gameplayRakeCommissionKes +
      agent.wingOverrideCommissionKes;
    agent.pendingOwedKes = Math.max(0, agent.totalEarnedKes - agent.totalPaidKes);
    if (isSub && agent.parentAgentId) {
      const parent = this.agents.find((a) => a.id === agent.parentAgentId);
      if (parent) {
        parent.wingOverrideCommissionKes += parentFtd + parentRake;
        parent.totalEarnedKes =
          parent.firstDepositCommissionKes +
          parent.gameplayRakeCommissionKes +
          parent.wingOverrideCommissionKes;
        parent.pendingOwedKes = Math.max(0, parent.totalEarnedKes - parent.totalPaidKes);
      }
    }
    return { ok: true, agent, overview: this.buildOverview() };
  }
}
