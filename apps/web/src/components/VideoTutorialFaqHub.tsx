'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Gamepad2,
  Eye,
  Coins,
  ShieldCheck,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Tv,
  Share2,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ProofOfVictoryCard } from './ProofOfVictoryCard';

interface TutorialVideo {
  id: string;
  title: string;
  shortTag: string;
  category: string;
  src: string;
  icon: React.ElementType;
  description: string;
  faqQuestion: string;
  faqAnswer: string;
  statsBadge: string;
}

const TUTORIALS: TutorialVideo[] = [
  {
    id: 'master-walkthrough',
    title: 'Complete Live Platform Tour & FC 27 Match Test',
    shortTag: 'Featured · Full Live Tour',
    category: 'LIVE UI WALKTHROUGH',
    src: '/tutorials/playverzus_full_platform_walkthrough.mp4',
    icon: Sparkles,
    description: 'Watch the complete end-to-end competitor journey: sign in, browse open duels, create an FC 27 duel with verified presets, connect console broadcast, and claim faucet rewards.',
    faqQuestion: 'How does a player navigate from sign-in to match settlement?',
    faqAnswer: 'The platform offers a seamless 60-second competitor journey: log in, pick an open challenge or create a custom duel with verified optical presets, join the live match room, connect your console stream or PC screen, and receive instant cryptographic settlement directly to your wallet upon the final whistle.',
    statsBadge: '100% Live Browser Navigation (40s)',
  },
  {
    id: 'duel-setup',
    title: '1v1 Duel Creation & Instant Escrow',
    shortTag: 'Step 1 · Matchmaking',
    category: 'MATCHMAKING',
    src: '/tutorials/fc27_duel_setup_tutorial.mp4',
    icon: Gamepad2,
    description: 'Set your stake, choose competitive rules (6-min halves, Tactical Defending), and lock escrow seamlessly across PS5, Xbox, and PC.',
    faqQuestion: 'How do I challenge another player in EA Sports FC 27?',
    faqAnswer: 'Simply select EA Sports FC 27, set your stake amount ($5 to $500 USDC or points), configure match rules (6-min halves, Tactical Defending, 90 OVR), and create an open lobby. Once a challenger joins and both gamertags match, escrow locks automatically.',
    statsBadge: 'Instant 0.8s Matchmaking Lock',
  },
  {
    id: 'cv-engine',
    title: 'AI Computer Vision (Zero Game Bans)',
    shortTag: 'Step 2 · Optical AI',
    category: 'COMPUTER VISION',
    src: '/tutorials/fc27_cv_engine_tutorial.mp4',
    icon: Eye,
    description: 'Antigravity reads passive optical frames from your console broadcast or PC window. Zero memory injection, zero mods, and 100% EA Anti-Cheat safe.',
    faqQuestion: 'Can EA Anti-Cheat ban me for using Playverzus?',
    faqAnswer: 'Never. Playverzus uses zero game hooks, zero DLL injections, and zero memory modifications. Our system functions purely as a spectator Computer Vision engine, analyzing the broadcast stream or window feed like human eyes. It is 100% compliant with EA terms of service.',
    statsBadge: '99.8% Optical Neural Confidence',
  },
  {
    id: 'settlement',
    title: 'Instant Payout & Proof of Victory',
    shortTag: 'Step 3 · Settlement',
    category: 'INSTANT PAYOUT',
    src: '/tutorials/fc27_instant_settlement_tutorial.mp4',
    icon: Coins,
    description: 'Full-time whistle triggers dual-consensus verification. Funds credit directly to the winner balance in < 2 seconds with an official Proof of Victory card.',
    faqQuestion: 'How and when do I receive my prize money?',
    faqAnswer: 'The instant the final whistle is detected on both player feeds, our distributed settlement engine atomically credits the winner balance (minus standard rake). A cryptographic Proof of Victory card is generated with our signature brand outline on the winning side, ready for 1-click sharing to X and Discord.',
    statsBadge: 'Sub-2s Automated Settlement',
  },
  {
    id: 'anticheat',
    title: 'Anti-Cheat & Disconnect Protection',
    shortTag: 'Step 4 · Security',
    category: 'DEFCON SECURITY',
    src: '/tutorials/fc27_anticheat_disputes_tutorial.mp4',
    icon: ShieldCheck,
    description: 'If an opponent rage quits, disconnects, or manipulates their stream, our 120s grace timer and Security Operations Center (SOC) ensure you never lose your stake.',
    faqQuestion: 'What happens if my opponent rage quits or disconnects?',
    faqAnswer: 'If an opponent disconnects mid-match, a 120-second reconnection grace period starts immediately. If they fail to resume their broadcast, our automated anti-cheat issues a technical forfeit, awarding 100% of the prize pool to the active player. If any dispute arises, our SOC Security Engineers review the frame hashes within 15 minutes.',
    statsBadge: '120s Failsafe Grace Buffer',
  },
];

export function VideoTutorialFaqHub() {
  const [selectedTutorial, setSelectedTutorial] = useState<TutorialVideo>(TUTORIALS[0]!);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [activeFaqAccordion, setActiveFaqAccordion] = useState<string | null>('duel-setup');
  const [previewWinner, setPreviewWinner] = useState<'APEX' | 'VORTEX'>('APEX');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSelectTutorial = (tut: TutorialVideo) => {
    setSelectedTutorial(tut);
    setActiveFaqAccordion(tut.id);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Social Proof Teaser */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-background to-secondary/30 border border-primary/20 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="copper" className="font-mono text-[10px]">
              VERIFIED WORKING PLATFORM · SOCIAL PROOF
            </Badge>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live CV Engine Active
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            EA Sports FC 27: Interactive Gameplay & Video Tutorials
          </h2>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Watch real-time optical tracking in action, explore verified userflows, and learn how instant smart escrow protects every match.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/challenges">
            <Button size="sm" className="font-bold gap-1.5 shadow-md">
              <Gamepad2 className="w-4 h-4" />
              <span>Explore FC 27 Arenas</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Video Walkthrough Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 16:9 Video Player */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-border bg-black shadow-2xl group aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              key={selectedTutorial.src}
              src={selectedTutorial.src}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Video Controls Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity" />

            {/* Top Video Header Tag */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-[10px] font-mono font-bold bg-primary/80 backdrop-blur-md">
                  {selectedTutorial.category}
                </Badge>
                <span className="text-[11px] font-mono text-white/90 bg-black/60 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
                  {selectedTutorial.statsBadge}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white/90 border border-white/10 transition"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Center Play Button Overlay */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition pointer-events-auto opacity-0 group-hover:opacity-100 focus:opacity-100"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1 fill-current" />}
            </button>

            {/* Bottom Title Bar */}
            <div className="absolute bottom-3 left-3 right-3 pointer-events-auto flex items-end justify-between">
              <div>
                <p className="text-[11px] font-mono text-primary font-bold">
                  {selectedTutorial.shortTag}
                </p>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  {selectedTutorial.title}
                </h3>
              </div>
              <div className="text-[10px] font-mono text-white/70 bg-black/50 px-2 py-1 rounded border border-white/10">
                1080p · 30 FPS
              </div>
            </div>
          </div>

          {/* Quick Step Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {TUTORIALS.map((t, idx) => {
              const Icon = t.icon;
              const isSelected = selectedTutorial.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTutorial(t)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-primary/10 border-primary ring-1 ring-primary/40 shadow-sm'
                      : 'bg-card border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-[9px] font-mono text-muted-foreground">0{idx + 1}</span>
                  </div>
                  <span className={`text-[11px] font-bold line-clamp-1 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {t.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Interactive Tutorial Explainer & FAQ Accordion */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5 bg-card border-border shadow-md space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-extrabold text-foreground">
                Verified Social Proof & FAQ Deep-Dive
              </h3>
            </div>

            <div className="space-y-2.5">
              {TUTORIALS.map((t) => {
                const Icon = t.icon;
                const isOpen = activeFaqAccordion === t.id;
                const isSelected = selectedTutorial.id === t.id;

                return (
                  <div
                    key={t.id}
                    className={`rounded-xl border transition overflow-hidden ${
                      isSelected
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border bg-secondary/20 hover:border-border/80'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setActiveFaqAccordion(isOpen ? null : t.id);
                        if (!isSelected) handleSelectTutorial(t);
                      }}
                      className="w-full p-3 flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {t.shortTag}
                          </p>
                          <h4 className="text-xs font-bold text-foreground truncate">
                            {t.faqQuestion}
                          </h4>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="px-3.5 pb-3.5 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/50 space-y-2">
                        <p>{t.faqAnswer}</p>
                        <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                          <span>Status: {t.statsBadge}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Direct CTA Card */}
          <Card className="p-4 bg-muted/40 border-border flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">Ready to prove your skills?</p>
              <p className="text-[11px] text-muted-foreground">Stakes start from $5 with 0% deposit fees.</p>
            </div>
            <Link href="/matches/new">
              <Button size="sm" variant="default" className="text-xs font-bold gap-1 shadow-sm">
                <span>Create Duel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      {/* Interactive Proof of Victory Inspector */}
      <Card className="p-6 bg-card border-border shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="copper">SOCIAL PROOF GENERATOR</Badge>
              <span className="text-xs text-primary font-mono font-bold">Brand Color Outline Verification</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Cryptographic Proof of Victory Brag Card
            </h3>
            <p className="text-xs text-muted-foreground max-w-xl">
              When a match settles, players receive a certified match card. Notice how our signature brand outline (<code className="text-primary font-bold">#8B5CF6</code>) strictly highlights the winning side only.
            </p>
          </div>

          {/* Toggle Interactive Winner */}
          <div className="flex items-center gap-2 bg-secondary/50 p-1.5 rounded-xl border border-border">
            <span className="text-[11px] text-muted-foreground font-mono font-bold mr-1">Simulate Winner:</span>
            <Button
              size="sm"
              variant={previewWinner === 'APEX' ? 'default' : 'ghost'}
              className="text-xs font-bold h-7 px-2.5"
              onClick={() => setPreviewWinner('APEX')}
            >
              ApexStriker (Host)
            </Button>
            <Button
              size="sm"
              variant={previewWinner === 'VORTEX' ? 'default' : 'ghost'}
              className="text-xs font-bold h-7 px-2.5"
              onClick={() => setPreviewWinner('VORTEX')}
            >
              VortexPro (Challenger)
            </Button>
          </div>
        </div>

        {/* Live Card Render */}
        <div className="flex justify-center py-2">
          <div className="w-full max-w-lg">
            <ProofOfVictoryCard
              matchId="m_fc27_verified_demo"
              gameName="EA Sports FC 27"
              gamePlatform="PS5 · PC"
              playerAId="user_apex"
              playerAName="ApexStriker"
              playerAGamertag="ApexStriker_PSN"
              playerACountry="US"
              playerBId="user_vortex"
              playerBName="VortexPro"
              playerBGamertag="VortexPro_EA"
              playerBCountry="GB"
              winnerId={previewWinner === 'APEX' ? 'user_apex' : 'user_vortex'}
              scoreText={previewWinner === 'APEX' ? '3 - 1' : '1 - 2'}
              prizeAmount={47.50}
              confidence={0.998}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
