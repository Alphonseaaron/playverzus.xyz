'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import type { GameProfile } from '@playverzus/core';
import { apiClient } from '../lib/api';

export interface CaptureState {
  status: 'IDLE' | 'CAPTURING' | 'VERIFYING' | 'ENDED' | 'ERROR';
  lastScore: string | null;
  confidence: number;
  error: string | null;
}

export function useCapturePipeline(matchId: string, profile: GameProfile | null) {
  const [state, setState] = useState<CaptureState>({
    status: 'IDLE',
    lastScore: null,
    confidence: 0,
    error: null,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const workerRef = useRef<Tesseract.Worker | null>(null);

  const lastSubmittedTextRef = useRef<string | null>(null);
  const lastSubmittedTimeRef = useRef<number>(0);

  // Initialize Tesseract worker
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const worker = await Tesseract.createWorker('eng');
        if (active) {
          workerRef.current = worker;
        } else {
          await worker.terminate();
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setState((prev) => ({ ...prev, error: `Match verification engine initialization failed: ${message}` }));
      }
    })();

    return () => {
      active = false;
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const stopCapture = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setState((prev) => ({ ...prev, status: 'ENDED' }));

    // Trigger match settlement on capture stop
    try {
      await apiClient(`/matches/${matchId}/settle`, { method: 'POST' });
    } catch {
      // Settle may be handled on backend already
    }
  }, [matchId]);

  const startCapture = useCallback(async () => {
    if (!profile) {
      setState((prev) => ({ ...prev, error: 'Game profile not selected' }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: false,
      });

      streamRef.current = stream;

      // When user stops screen sharing from browser UI
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stopCapture();
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      videoRef.current = video;

      setState({ status: 'CAPTURING', lastScore: null, confidence: 0, error: null });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // 1.5s OCR loop
      timerRef.current = setInterval(async () => {
        if (document.hidden || !workerRef.current || !videoRef.current || !ctx) {
          return;
        }

        const v = videoRef.current;
        if (v.videoWidth === 0 || v.videoHeight === 0) return;

        const roi = profile.roi;
        const sx = Math.max(0, Math.floor(roi.x * v.videoWidth));
        const sy = Math.max(0, Math.floor(roi.y * v.videoHeight));
        const sw = Math.max(10, Math.floor(roi.w * v.videoWidth));
        const sh = Math.max(10, Math.floor(roi.h * v.videoHeight));

        canvas.width = sw;
        canvas.height = sh;

        // Apply grayscale and threshold enhancement via canvas filter
        ctx.filter = 'grayscale(100%) contrast(150%) brightness(90%)';
        ctx.drawImage(v, sx, sy, sw, sh, 0, 0, sw, sh);

        try {
          const { data } = await workerRef.current.recognize(canvas);
          const text = data.text?.trim() ?? '';
          const confidence = (data.confidence ?? 0) / 100;

          if (text.length > 0) {
            // Check end keywords
            const isFinal = profile.endKeywords.some((kw) =>
              text.toLowerCase().includes(kw.toLowerCase()),
            );

            setState((prev) => ({
              ...prev,
              lastScore: text,
              confidence,
              status: isFinal ? 'VERIFYING' : 'CAPTURING',
            }));

            // Only send HTTP POST if score actually changed, game is final, or 30s elapsed heartbeat
            const textChanged = text !== lastSubmittedTextRef.current;
            const heartbeatDue = Date.now() - lastSubmittedTimeRef.current > 30_000;

            if (textChanged || isFinal || heartbeatDue) {
              lastSubmittedTextRef.current = text;
              lastSubmittedTimeRef.current = Date.now();

              // Submit score to backend
              await apiClient(`/matches/${matchId}/score`, {
                method: 'POST',
                body: JSON.stringify({
                  rawText: text,
                  confidence,
                  isFinal,
                  source: 'CLIENT_OCR',
                }),
              });
            }

            if (isFinal) {
              await stopCapture();
            }
          }
        } catch {
          // Non-fatal frame parse drop, retry on next interval
        }
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ status: 'ERROR', lastScore: null, confidence: 0, error: message });
    }
  }, [matchId, profile, stopCapture]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    ...state,
    startCapture,
    stopCapture,
  };
}
