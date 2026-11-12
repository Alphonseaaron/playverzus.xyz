'use client';

import React, { useState } from 'react';
import {
  Gamepad2,
  CheckCircle2,
  Edit2,
  Check,
  Plus,
  ShieldCheck,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { useGameAccountsStore } from '../../lib/gameAccountsStore';
import { notifyUser } from '../../lib/notifications';

interface GameItem {
  id: string;
  name: string;
  tagLabel: string;
  placeholder: string;
  platform: 'PC' | 'CONSOLE' | 'MOBILE' | 'UNIVERSAL';
}

const SUPPORTED_GAMES: GameItem[] = [
  { id: 'cs2', name: 'Counter-Strike 2', tagLabel: 'Steam ID / Friend Code', placeholder: 'e.g. 76561198... or s1mple', platform: 'PC' },
  { id: 'eafc', name: 'EA Sports FC 25', tagLabel: 'EA ID / PSN Handle', placeholder: 'e.g. ProStriker_99', platform: 'CONSOLE' },
  { id: 'val', name: 'Valorant', tagLabel: 'Riot ID (Name#TAG)', placeholder: 'e.g. TenZ#NA1', platform: 'PC' },
  { id: 'mlbb', name: 'Mobile Legends: Bang Bang', tagLabel: 'MLBB User ID (Server ID)', placeholder: 'e.g. 12345678 (2041)', platform: 'MOBILE' },
  { id: 'rl', name: 'Rocket League', tagLabel: 'Epic Games ID', placeholder: 'e.g. Zen_RL', platform: 'UNIVERSAL' },
  { id: 'dota2', name: 'Dota 2', tagLabel: 'Steam ID / Friend Code', placeholder: 'e.g. 89234102', platform: 'PC' },
  { id: 'cod', name: 'Call of Duty: Warzone', tagLabel: 'Activision ID (Name#1234)', placeholder: 'e.g. Scump#1234567', platform: 'UNIVERSAL' },
  { id: 'fortnite', name: 'Fortnite', tagLabel: 'Epic Games ID', placeholder: 'e.g. Mongraal', platform: 'UNIVERSAL' },
  { id: 'apex', name: 'Apex Legends', tagLabel: 'EA ID / Gamertag', placeholder: 'e.g. ImperialHal', platform: 'UNIVERSAL' },
  { id: 'tekken8', name: 'Tekken 8', tagLabel: 'Tekken ID / PSN', placeholder: 'e.g. ArslanAsh', platform: 'CONSOLE' },
];

export function LinkedGameAccountsCard() {
  const { accounts, getGamertag, setGamertag } = useGameAccountsStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleStartEdit = (gameId: string, currentVal: string) => {
    setEditingId(gameId);
    setInputValue(currentVal);
  };

  const handleSave = (gameId: string) => {
    if (!inputValue.trim()) return;
    setGamertag(gameId, inputValue.trim());
    setEditingId(null);
    notifyUser('Gamertag Saved', {
      body: `Your in-game handle for this title has been updated.`,
      sound: 'score',
    });
  };

  const handleCopy = (tag: string, gameId: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(tag);
      setCopiedId(gameId);
      setTimeout(() => setCopiedId(null), 2000);
      notifyUser('Handle Copied to Clipboard', { sound: 'score' });
    }
  };

  const linkedCount = Object.keys(accounts).length;

  return (
    <Card className="border border-border bg-card shadow-xl overflow-hidden space-y-5 p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              In-Game Gamertags & Connected Accounts
            </h3>
            <Badge variant="copper" className="font-mono text-xs">
              {linkedCount} LINKED
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            These handles are displayed to your opponents in matchrooms so they can invite you to lobbies.
            Keep them updated with your exact in-game usernames.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUPPORTED_GAMES.map((game) => {
          const linkedTag = accounts[game.id] || getGamertag(game.id);
          const isEditing = editingId === game.id;

          return (
            <div
              key={game.id}
              className={`p-4 rounded-xl border transition-all ${
                linkedTag
                  ? 'bg-secondary/40 border-border hover:border-primary/40'
                  : 'bg-muted/30 border-dashed border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground truncate">{game.name}</span>
                    <Badge variant="outline" className="font-mono text-[9px] uppercase px-1 py-0">
                      {game.platform}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                    {game.tagLabel}
                  </span>
                </div>

                {linkedTag ? (
                  <Badge variant="success" className="font-mono text-[10px] flex-shrink-0">
                    LINKED ✓
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="font-mono text-[10px] flex-shrink-0">
                    NOT LINKED
                  </Badge>
                )}
              </div>

              {isEditing ? (
                <div className="flex items-center gap-2 mt-3 animate-in fade-in duration-150">
                  <Input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={game.placeholder}
                    className="h-8 text-xs font-mono flex-1"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleSave(game.id)}
                    className="h-8 text-xs font-bold px-3"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    className="h-8 text-xs px-2"
                  >
                    Cancel
                  </Button>
                </div>
              ) : linkedTag ? (
                <div className="flex items-center justify-between mt-3 p-2 rounded-lg bg-card border border-border">
                  <span className="font-mono font-bold text-xs text-foreground truncate max-w-[200px]">
                    {linkedTag}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(linkedTag, game.id)}
                      className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      {copiedId === game.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartEdit(game.id, linkedTag)}
                      className="h-7 px-2 text-[10px] gap-1 font-semibold"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleStartEdit(game.id, '')}
                    className="w-full h-8 text-xs font-semibold gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    <span>Connect Handle</span>
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
