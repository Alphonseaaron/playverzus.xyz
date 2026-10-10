'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CalibrationTool } from '../../../components/CalibrationTool';
import { apiClient } from '../../../lib/api';
import { notifyUser } from '../../../lib/notifications';
import { autoAnalyzeScreenshots, type AutoCalibrateResult } from '../../../lib/autoCalibrate';
import type { GameType, Platform, ROI } from '@playverzus/core';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Monitor,
  Gamepad2,
  Smartphone,
  Globe,
  Dices,
  Sparkles,
  UploadCloud,
  Trash2,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Crop,
  ArrowLeft,
} from 'lucide-react';

const AVAILABLE_PLATFORMS: { value: Platform; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'PC', label: 'PC', icon: Monitor },
  { value: 'CONSOLE', label: 'Console', icon: Gamepad2 },
  { value: 'MOBILE', label: 'Mobile', icon: Smartphone },
  { value: 'WEB', label: 'Web / Browser', icon: Globe },
  { value: 'PHYSICAL', label: 'Physical Analog', icon: Dices },
];

interface UploadedImage {
  id: string;
  name: string;
  url: string;
}

function NewGameProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdminMode = searchParams.get('mode') === 'admin';

  // Step 1: Identification & Multi-Platform
  const [displayName, setDisplayName] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['PC']);

  // Step 2: Reference Images
  const [referenceImages, setReferenceImages] = useState<UploadedImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [autoAnalysisMessage, setAutoAnalysisMessage] = useState<string | null>(null);

  // Step 3: Game Parameters (Autofilled & Editable)
  const [gameType, setGameType] = useState<GameType>('HIGH_SCORE');
  const [endKeywords, setEndKeywords] = useState('Game Over, Victory, Defeat, Final Score');
  const [regexPattern, setRegexPattern] = useState('([0-9][0-9,\\.]*)');
  const [roi, setRoi] = useState<ROI>({ x: 0.65, y: 0.05, w: 0.3, h: 0.08 });
  const [autoApprove, setAutoApprove] = useState(isAdminMode);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle platform selection (multi-select)
  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(p)) {
        if (prev.length === 1) return prev; // At least one platform required
        return prev.filter((item) => item !== p);
      } else {
        return [...prev, p];
      }
    });
  };

  // Handle screenshot file uploads (multiple files)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: UploadedImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const dataUrl = await readFileAsDataUrl(file);
      newImages.push({
        id: `${Date.now()}-${i}`,
        name: file.name,
        url: dataUrl,
      });
    }

    const updated = [...referenceImages, ...newImages];
    setReferenceImages(updated);
    runAutoAnalysis(updated.map((img) => img.url));
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = referenceImages.filter((img) => img.id !== id);
    setReferenceImages(updated);
    if (activeImageIndex >= updated.length) {
      setActiveImageIndex(Math.max(0, updated.length - 1));
    }
  };

  const runAutoAnalysis = async (urls: string[]) => {
    if (urls.length === 0) return;
    setAnalyzing(true);
    setAutoAnalysisMessage(null);
    setError(null);

    try {
      const result: AutoCalibrateResult = await autoAnalyzeScreenshots(urls);

      setGameType(result.detectedGameType);
      setEndKeywords(result.detectedEndKeywords.join(', '));
      setRegexPattern(result.detectedRegexPattern);
      setRoi(result.detectedRoi);

      setAutoAnalysisMessage(
        `Auto-detection Complete (${result.confidence}% confidence): Detected ${result.detectedGameType} format, ${result.detectedEndKeywords.length} end trigger keywords, and calibrated score bounding box.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAutoAnalysisMessage(`Auto-scan note: ${msg} Standard templates loaded.`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please provide a game title.');
      return;
    }
    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const primaryPlatform = selectedPlatforms[0];
      const keywordsArray = endKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const created = await apiClient<{ id: string }>('/games', {
        method: 'POST',
        body: JSON.stringify({
          displayName: displayName.trim(),
          gameType,
          platform: primaryPlatform,
          roi,
          constraints: {
            platforms: selectedPlatforms,
          },
          endKeywords: keywordsArray,
          regexPattern: regexPattern.trim() ? regexPattern.trim() : null,
        }),
      });

      if (autoApprove && created?.id) {
        try {
          await apiClient(`/games/${created.id}/approve`, { method: 'POST' });
        } catch {
          // Non-blocking if current user is not admin
        }
      }

      notifyUser('Game profile registered!', { body: 'Your game has been submitted successfully.', type: 'match' });
      router.push('/games');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setLoading(false);
    }
  };

  const activeImage = referenceImages[activeImageIndex]?.url || null;

  return (
    <div className="max-w-3xl mx-auto my-6 space-y-6">
      <Link
        href="/games"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition font-semibold"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Games Registry</span>
      </Link>

      <Card className="bg-card border-border shadow-2xl">
        <CardHeader className="border-b border-border pb-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="copper" className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Auto-Calibration
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  NEW GAME TITLE
                </Badge>
              </div>
              <CardTitle className="text-2xl font-black tracking-tight text-foreground">
                Calibrate & Register Game Profile
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Register game details, upload screenshots for automated detection, and fine-tune score boundaries.
              </CardDescription>
            </div>

            {isAdminMode && (
              <Badge variant="warning" className="font-mono text-[10px] flex-shrink-0">
                ADMIN MODE
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {error && (
            <div className="mb-6 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Game Title */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                1. Game Display Title
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. Rocket League, Subway Surfers, Tekken 8"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Step 2: Platforms */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  2. Supported Platforms
                </label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {selectedPlatforms.length} selected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {AVAILABLE_PLATFORMS.map((p) => {
                  const isSelected = selectedPlatforms.includes(p.value);
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => togglePlatform(p.value)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-secondary/60 border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Reference Screenshots */}
            <Card className="bg-secondary/40 border-border p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Crop className="w-3.5 h-3.5" />
                    <span>Reference Screenshots for Auto-Fill</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Upload gameplay HUD screenshots to automatically detect score positions.
                  </p>
                </div>

                {referenceImages.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => runAutoAnalysis(referenceImages.map((i) => i.url))}
                    disabled={analyzing}
                    className="text-xs font-bold gap-1 self-start sm:self-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>{analyzing ? 'Analyzing...' : 'Re-run Detection'}</span>
                  </Button>
                )}
              </div>

              {/* Upload Input Box */}
              <label className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-secondary/30 hover:bg-secondary/60 text-center">
                <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-xs font-bold text-foreground">
                  Click to browse or drop screenshots here
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">
                  Supports PNG, JPG, WebP. You can select multiple images at once.
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Uploaded Thumbnails */}
              {referenceImages.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] text-muted-foreground font-mono font-bold block">
                    Uploaded Screenshots ({referenceImages.length}): Click thumbnail to calibrate
                  </span>
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                    {referenceImages.map((img, idx) => (
                      <div
                        key={img.id}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative w-24 h-16 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2 transition ${
                          activeImageIndex === idx
                            ? 'border-primary shadow-md scale-105'
                            : 'border-border opacity-70 hover:opacity-100'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => removeImage(img.id, e)}
                          className="absolute top-1 right-1 bg-black/80 hover:bg-destructive text-white rounded-md w-4 h-4 flex items-center justify-center text-[10px] transition"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {autoAnalysisMessage && !analyzing && (
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl text-xs text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{autoAnalysisMessage}</span>
                </div>
              )}
            </Card>

            {/* Step 4: Game Parameters */}
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground block">
                    Score Extraction Rule
                  </label>
                  <select
                    value={gameType}
                    onChange={(e) => setGameType(e.target.value as GameType)}
                    className="w-full h-10 px-3 bg-secondary/70 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary transition"
                  >
                    <option value="HEAD_TO_HEAD">Head-to-Head Score (Direct HUD)</option>
                    <option value="HIGH_SCORE">Highest Score Wins (Points / High score)</option>
                    <option value="BINARY_RESULT">Match Outcome (Win / Loss detected)</option>
                    <option value="LOW_TIME">Time Trial / Speedrun (Fastest wins)</option>
                    <option value="SURVIVAL">Survival / Endurance (Longest time)</option>
                    <option value="COMPOSITE_STAT">Composite Formula (Weighted stats)</option>
                    <option value="PROGRESSION">Rank Tier (Rank progression)</option>
                    <option value="PHYSICAL">Physical / Analog (Whiteboard / camera)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground block">
                    Custom Regex Pattern (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. ([0-9][0-9,\.]*)"
                    value={regexPattern}
                    onChange={(e) => setRegexPattern(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  End Match Detection Keywords (Comma-separated)
                </label>
                <Input
                  type="text"
                  placeholder="Game Over, Victory, Defeat, Final Score"
                  value={endKeywords}
                  onChange={(e) => setEndKeywords(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Calibration Tool */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  Score Region Boundary Calibration
                </label>
                <CalibrationTool
                  initialRoi={roi}
                  imageUrl={activeImage}
                  onChange={(newRoi) => setRoi(newRoi)}
                />
              </div>
            </div>

            {/* Admin Auto-Approve Option */}
            {isAdminMode && (
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoApprove"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                />
                <label htmlFor="autoApprove" className="text-xs text-foreground cursor-pointer">
                  <strong className="text-primary">Direct Admin Approval:</strong> Automatically approve and mark as official upon saving.
                </label>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || analyzing}
              variant="default"
              size="lg"
              className="w-full font-bold text-xs uppercase tracking-wider shadow-md shadow-primary/20 gap-2"
            >
              <span>{loading ? 'Registering...' : 'Save & Register Game Profile'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewGameProfilePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-muted-foreground">Loading Game Calibrator...</div>}>
      <NewGameProfileForm />
    </Suspense>
  );
}
