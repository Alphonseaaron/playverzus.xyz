'use client';

import { useState, useRef, MouseEvent, useEffect } from 'react';
import type { ROI } from '@playverzus/core';
import { testOcrOnRoi } from '../lib/autoCalibrate';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Crop, Sparkles, CheckCircle2, Crosshair, Clock, Trophy, BarChart3, Save } from 'lucide-react';

interface CalibrationToolProps {
  initialRoi?: ROI;
  imageUrl?: string | null;
  onSave?: (roi: ROI) => void;
  onChange?: (roi: ROI) => void;
}

export function CalibrationTool({
  initialRoi = { x: 0.1, y: 0.1, w: 0.3, h: 0.2 },
  imageUrl = null,
  onSave,
  onChange,
}: CalibrationToolProps) {
  const [roi, setRoi] = useState<ROI>(initialRoi);
  const [isDrawing, setIsDrawing] = useState(false);
  const [testResult, setTestResult] = useState<{ text: string; confidence: number } | null>(null);
  const [testing, setTesting] = useState(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync state if initialRoi updates from parent auto-fill
  useEffect(() => {
    setRoi(initialRoi);
  }, [initialRoi.x, initialRoi.y, initialRoi.w, initialRoi.h]);

  const updateRoi = (newRoi: ROI) => {
    setRoi(newRoi);
    setTestResult(null);
    onChange?.(newRoi);
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    startPos.current = { x, y };
    setIsDrawing(true);
    updateRoi({ x, y, w: 0.05, h: 0.05 });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPos.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const currentY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const x = Math.min(startPos.current.x, currentX);
    const y = Math.min(startPos.current.y, currentY);
    const w = Math.max(0.04, Math.abs(currentX - startPos.current.x));
    const h = Math.max(0.03, Math.abs(currentY - startPos.current.y));

    updateRoi({
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      w: Number(w.toFixed(4)),
      h: Number(h.toFixed(4)),
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const applyPreset = (preset: ROI) => {
    updateRoi(preset);
  };

  const handleTestDetection = async () => {
    if (!imageUrl) {
      alert('Please upload a reference screenshot first to test visual read.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testOcrOnRoi(imageUrl, roi);
      setTestResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Detection test failed: ${msg}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4 p-4 bg-card border-border shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black tracking-tight uppercase text-foreground flex items-center gap-1.5 font-mono">
              <Crosshair className="w-3.5 h-3.5 text-primary" />
              <span>Score Bounding Box (ROI)</span>
            </h3>
            {imageUrl && (
              <Badge variant="success" className="text-[9px] font-mono px-1.5 py-0">
                SCREENSHOT LOADED
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Click and drag on the preview canvas to frame the live score or timer region.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {imageUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestDetection}
              disabled={testing}
              className="font-bold text-xs gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>{testing ? 'Reading...' : 'Test Visual Detection'}</span>
            </Button>
          )}

          {onSave && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => onSave(roi)}
              className="font-bold text-xs gap-1.5 shadow-md shadow-primary/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Calibration</span>
            </Button>
          )}
        </div>
      </div>

      {/* Preset Quick Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono mr-1">
          Presets:
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => applyPreset({ x: 0.65, y: 0.04, w: 0.3, h: 0.08 })}
          className="text-[11px] h-7 px-2.5 gap-1 text-muted-foreground hover:text-foreground"
        >
          <Crosshair className="w-3 h-3 text-primary" />
          <span>Top-Right (Score)</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => applyPreset({ x: 0.05, y: 0.04, w: 0.28, h: 0.08 })}
          className="text-[11px] h-7 px-2.5 gap-1 text-muted-foreground hover:text-foreground"
        >
          <Clock className="w-3 h-3 text-primary" />
          <span>Top-Left (Timer)</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => applyPreset({ x: 0.15, y: 0.35, w: 0.7, h: 0.2 })}
          className="text-[11px] h-7 px-2.5 gap-1 text-muted-foreground hover:text-foreground"
        >
          <Trophy className="w-3 h-3 text-primary" />
          <span>Center (Victory Banner)</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => applyPreset({ x: 0.3, y: 0.85, w: 0.4, h: 0.1 })}
          className="text-[11px] h-7 px-2.5 gap-1 text-muted-foreground hover:text-foreground"
        >
          <BarChart3 className="w-3 h-3 text-primary" />
          <span>Bottom (HUD)</span>
        </Button>
      </div>

      {/* Interactive Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative w-full h-80 sm:h-96 bg-background rounded-xl overflow-hidden cursor-crosshair border border-dashed border-border select-none flex items-center justify-center shadow-inner"
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Reference gameplay for calibration"
            className="w-full h-full object-contain pointer-events-none"
          />
        ) : (
          <div className="text-muted-foreground pointer-events-none text-center p-4">
            <Crop className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
            <p className="text-xs font-bold text-foreground">Interactive Preview Canvas</p>
            <p className="text-[11px] mt-1 text-muted-foreground max-w-sm">
              Upload reference gameplay screenshots above to calibrate directly over your game HUD, or drag to frame the ROI box.
            </p>
          </div>
        )}

        {/* Bounding Box overlay */}
        <div
          className="absolute border-2 border-primary bg-primary/20 pointer-events-none transition-all duration-75 shadow-md shadow-primary/30"
          style={{
            left: `${roi.x * 100}%`,
            top: `${roi.y * 100}%`,
            width: `${roi.w * 100}%`,
            height: `${roi.h * 100}%`,
          }}
        >
          <div className="absolute top-1 left-1 bg-background/90 px-1.5 py-0.5 rounded text-[10px] text-primary font-mono border border-primary/40 shadow">
            ROI: {(roi.w * 100).toFixed(1)}% × {(roi.h * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Live Read Result Banner */}
      {testResult && (
        <div className="p-3 bg-secondary/80 border border-primary/30 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div>
            <span className="text-muted-foreground">Detected Score: </span>
            <span className="font-mono font-bold text-foreground text-sm">
              {testResult.text ? `"${testResult.text}"` : '<No readable score text detected>'}
            </span>
          </div>
          <Badge variant="copper" className="font-mono text-[10px]">
            {testResult.confidence}% confidence
          </Badge>
        </div>
      )}

      {/* Numerical Coordinate Display */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="p-2.5 bg-secondary/60 rounded-xl border border-border">
          <span className="text-muted-foreground block text-[9px] uppercase font-bold">X Offset</span>
          <span className="font-bold text-foreground">{(roi.x * 100).toFixed(2)}%</span>
        </div>
        <div className="p-2.5 bg-secondary/60 rounded-xl border border-border">
          <span className="text-muted-foreground block text-[9px] uppercase font-bold">Y Offset</span>
          <span className="font-bold text-foreground">{(roi.y * 100).toFixed(2)}%</span>
        </div>
        <div className="p-2.5 bg-secondary/60 rounded-xl border border-border">
          <span className="text-muted-foreground block text-[9px] uppercase font-bold">Width</span>
          <span className="font-bold text-foreground">{(roi.w * 100).toFixed(2)}%</span>
        </div>
        <div className="p-2.5 bg-secondary/60 rounded-xl border border-border">
          <span className="text-muted-foreground block text-[9px] uppercase font-bold">Height</span>
          <span className="font-bold text-foreground">{(roi.h * 100).toFixed(2)}%</span>
        </div>
      </div>
    </Card>
  );
}
