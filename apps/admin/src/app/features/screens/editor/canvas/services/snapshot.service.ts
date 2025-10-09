import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { CanvasState } from './canvas.store';

interface SnapshotData {
  id?: number;
  pageId: string;
  timestamp: number;
  canvasData: string;
}

@Injectable({ providedIn: 'root' })
export class SnapshotService {
  private db: Dexie;
  private snapshots: Table<SnapshotData, number>;
  private currentPageId: string = 'default';
  private snapshotHistory: CanvasState[] = [];
  private currentIndex: number = -1;
  private readonly MAX_SNAPSHOTS = 50;
  private readonly MAX_HISTORY = 50;

  constructor() {
    this.db = new Dexie('canvas-snapshots');
    this.db.version(1).stores({
      snapshots: '++id, pageId, timestamp'
    });
    this.snapshots = this.db.table('snapshots');
  }

  setPageId(pageId: string): void {
    this.currentPageId = pageId;
    this.loadHistory();
  }

  async recordSnapshot(state: CanvasState): Promise<void> {
    if (this.currentIndex < this.snapshotHistory.length - 1) {
      this.snapshotHistory = this.snapshotHistory.slice(0, this.currentIndex + 1);
    }

    this.snapshotHistory.push(this.cloneState(state));
    this.currentIndex++;

    if (this.snapshotHistory.length > this.MAX_HISTORY) {
      this.snapshotHistory.shift();
      this.currentIndex--;
    }

    try {
      await this.snapshots.add({
        pageId: this.currentPageId,
        timestamp: Date.now(),
        canvasData: JSON.stringify(state)
      });

      const count = await this.snapshots.where('pageId').equals(this.currentPageId).count();
      if (count > this.MAX_SNAPSHOTS) {
        const oldest = await this.snapshots
          .where('pageId')
          .equals(this.currentPageId)
          .first();
        if (oldest?.id) {
          await this.snapshots.delete(oldest.id);
        }
      }
    } catch (error) {
      console.error('Failed to save snapshot:', error);
    }
  }

  undo(): CanvasState | null {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    return this.cloneState(this.snapshotHistory[this.currentIndex]);
  }

  redo(): CanvasState | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    return this.cloneState(this.snapshotHistory[this.currentIndex]);
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.snapshotHistory.length - 1;
  }

  async getSnapshots(pageId: string): Promise<SnapshotData[]> {
    try {
      return await this.snapshots
        .where('pageId')
        .equals(pageId)
        .reverse()
        .sortBy('timestamp');
    } catch (error) {
      console.error('Failed to load snapshots:', error);
      return [];
    }
  }

  async clearSnapshots(pageId: string): Promise<void> {
    try {
      await this.snapshots.where('pageId').equals(pageId).delete();
    } catch (error) {
      console.error('Failed to clear snapshots:', error);
    }
  }

  clearHistory(): void {
    this.snapshotHistory = [];
    this.currentIndex = -1;
  }

  private async loadHistory(): Promise<void> {
    try {
      const snapshots = await this.getSnapshots(this.currentPageId);
      if (snapshots.length > 0) {
        this.snapshotHistory = snapshots
          .slice(0, this.MAX_HISTORY)
          .map(s => JSON.parse(s.canvasData));
        this.currentIndex = this.snapshotHistory.length - 1;
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }

  private cloneState(state: CanvasState): CanvasState {
    return JSON.parse(JSON.stringify(state));
  }
}
