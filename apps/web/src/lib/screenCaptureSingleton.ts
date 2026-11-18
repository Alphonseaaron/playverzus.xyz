'use client';

import { updateScreenPermission } from './deviceMachineStore';

type StreamChangeCallback = (stream: MediaStream | null) => void;

let activeSessionStream: MediaStream | null = null;
const subscribers = new Set<StreamChangeCallback>();

export function hasActiveSessionStream(): boolean {
  if (!activeSessionStream) return false;
  const tracks = activeSessionStream.getVideoTracks();
  return tracks.length > 0 && tracks.some((t) => t.readyState === 'live');
}

export function getSessionStream(): MediaStream | null {
  if (!activeSessionStream) return null;
  const tracks = activeSessionStream.getVideoTracks();
  if (tracks.length === 0 || tracks.every((t) => t.readyState === 'ended')) {
    activeSessionStream = null;
    return null;
  }
  return activeSessionStream;
}

export function setSessionStream(stream: MediaStream | null) {
  if (activeSessionStream && activeSessionStream !== stream) {
    try {
      activeSessionStream.getVideoTracks().forEach((track) => track.stop());
    } catch {}
  }

  activeSessionStream = stream;

  if (stream) {
    updateScreenPermission(true);

    // Watch for browser's native "Stop Sharing" button
    stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        if (activeSessionStream === stream) {
          activeSessionStream = null;
          notifySubscribers(null);
        }
      });
    });
  }

  notifySubscribers(activeSessionStream);
}

export async function requestSessionScreenShare(): Promise<MediaStream | null> {
  // If already active, return the existing live session stream
  if (hasActiveSessionStream()) {
    return getSessionStream();
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen capture is not supported in this browser environment.');
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: 15,
        displaySurface: 'monitor',
      } as MediaTrackConstraints,
      audio: false,
    });

    setSessionStream(stream);
    return stream;
  } catch (err: unknown) {
    // User cancelled prompt or denied
    return null;
  }
}

export function stopSessionStream() {
  if (activeSessionStream) {
    try {
      activeSessionStream.getVideoTracks().forEach((track) => track.stop());
    } catch {}
    activeSessionStream = null;
    notifySubscribers(null);
  }
}

export function subscribeToSessionStream(cb: StreamChangeCallback): () => void {
  subscribers.add(cb);
  cb(getSessionStream());
  return () => {
    subscribers.delete(cb);
  };
}

function notifySubscribers(stream: MediaStream | null) {
  subscribers.forEach((cb) => {
    try {
      cb(stream);
    } catch {}
  });
}
