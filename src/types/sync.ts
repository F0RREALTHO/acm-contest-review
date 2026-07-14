// Sync progress event types

export type SyncPhase =
  | "fetching_contest"
  | "fetching_problems"
  | "downloading_submissions"
  | "downloading_source_code"
  | "saving_to_database"
  | "fetching_leaderboard"
  | "complete"
  | "error";

export interface SyncProgressEvent {
  phase: SyncPhase;
  message: string;
  current: number;
  total: number | null;
  elapsedMs: number;
  estimatedRemainingMs: number | null;
}

export interface SyncSummary {
  submissionsAdded: number;
  participantsAdded: number;
  acceptedAdded: number;
  duration: number;
  syncStatus: "success" | "error";
  errorMessage?: string;
}

export interface SyncState {
  isRunning: boolean;
  progress: SyncProgressEvent | null;
  summary: SyncSummary | null;
  error: string | null;
}

// Global event emitter for sync progress
export type SyncEventCallback = (event: SyncProgressEvent) => void;

class SyncEventEmitter {
  private listeners: Set<SyncEventCallback> = new Set();

  subscribe(callback: SyncEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(event: SyncProgressEvent): void {
    this.listeners.forEach((cb) => cb(event));
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}

export const syncEvents = new SyncEventEmitter();
