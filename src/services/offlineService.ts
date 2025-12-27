import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import api from './api';

// Types - matching backend response from /api/dashboard/kpis
interface KPIData {
  tours_actives: number;
  caisses_dehors: number;
  conflits_ouverts: number;
  conflits_hors_tolerance: number;
  kilos_livres: number;
  tours_en_attente_retour: number;
  tours_en_attente_hygiene: number;
  tours_terminees_aujourdhui: number;
  tours_par_statut: Record<string, number>;
  // Stock data
  stock_actuel: number;
  stock_initial: number;
  stock_alerte: boolean;
  stock_configure: boolean;
  timestamp: string;
}

interface ConflictSummary {
  id: string;
  tourId: string;
  driver: string;
  secteur: string;
  matricule: string;
  quantite_perdue: number;
  montant_dette_tnd: number;
  depasse_tolerance: boolean;
  is_surplus: boolean;
  createdAt: string;
}

interface TourSummary {
  id: string;
  driver: string;
  secteur: string;
  matricule: string;
  statut: string;
  caisses_depart: number;
  caisses_retour: number | null;
  date_sortie: string | null;
  date_entree: string | null;
  createdAt: string;
}

interface QueuedAction {
  id: string;
  type: 'APPROVE_CONFLICT' | 'REJECT_CONFLICT';
  conflictId: string;
  notes?: string;
  timestamp: string;
}

interface CachedData<T> {
  data: T;
  cachedAt: string;
  expiresAt: string;
}

// Storage keys
const STORAGE_KEYS = {
  KPI: '@caisse_kpi_cache',
  CONFLICTS: '@caisse_conflicts_cache',
  TOURS: '@caisse_tours_cache',
  ACTION_QUEUE: '@caisse_action_queue',
  LAST_SYNC: '@caisse_last_sync',
  NOTIFICATIONS: '@caisse_notifications_cache',
};

// Cache durations (in milliseconds)
const CACHE_DURATION = {
  KPI: 5 * 60 * 1000,        // 5 minutes
  CONFLICTS: 15 * 60 * 1000,  // 15 minutes
  TOURS: 10 * 60 * 1000,      // 10 minutes
  NOTIFICATIONS: 5 * 60 * 1000, // 5 minutes
};

class OfflineService {
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    this.initNetworkListener();
  }

  // Initialize network state listener
  private async initNetworkListener() {
    try {
      const networkState = await Network.getNetworkStateAsync();
      this.isOnline = networkState.isConnected ?? true;
    } catch (error) {
      console.warn('[OfflineService] Could not get initial network state');
    }
  }

  // Check if device is online
  async checkOnlineStatus(): Promise<boolean> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      this.isOnline = networkState.isConnected ?? true;
      return this.isOnline;
    } catch (error) {
      return this.isOnline;
    }
  }

  // Subscribe to online/offline changes
  onNetworkChange(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify listeners of network change
  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.isOnline));
  }

  // Get cached data with expiry check
  private async getCached<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const parsed: CachedData<T> = JSON.parse(cached);
      const now = new Date().getTime();
      const expiresAt = new Date(parsed.expiresAt).getTime();

      if (now > expiresAt) {
        // Cache expired
        await AsyncStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error(`[OfflineService] Error reading cache ${key}:`, error);
      return null;
    }
  }

  // Set cached data with expiry
  private async setCache<T>(key: string, data: T, duration: number): Promise<void> {
    const now = new Date();
    const cached: CachedData<T> = {
      data,
      cachedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + duration).toISOString(),
    };
    
    try {
      await AsyncStorage.setItem(key, JSON.stringify(cached));
    } catch (error: any) {
      console.error(`[OfflineService] Error writing cache ${key}:`, error);
      // If storage is full, try to clear old caches
      if (error?.message?.includes('SQLITE_FULL') || error?.message?.includes('disk is full')) {
        console.warn('[OfflineService] Storage full, clearing old caches...');
        await this.clearAllCaches();
        // Retry once after clearing
        try {
          await AsyncStorage.setItem(key, JSON.stringify(cached));
        } catch (retryError) {
          console.error('[OfflineService] Still cannot write after clearing cache');
        }
      }
    }
  }

  // Clear all caches when storage is full
  async clearAllCaches(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.KPI,
        STORAGE_KEYS.CONFLICTS,
        STORAGE_KEYS.TOURS,
        STORAGE_KEYS.NOTIFICATIONS,
      ]);
      console.log('[OfflineService] Caches cleared');
    } catch (error) {
      console.error('[OfflineService] Error clearing caches:', error);
    }
  }

  // ==================== KPI Methods ====================

  async getKPIs(forceRefresh = false): Promise<{ data: KPIData | null; fromCache: boolean }> {
    const isOnline = await this.checkOnlineStatus();

    if (!forceRefresh && !isOnline) {
      // Offline: return cached data
      const cached = await this.getCached<KPIData>(STORAGE_KEYS.KPI);
      return { data: cached, fromCache: true };
    }

    if (isOnline) {
      try {
        const response = await api.get('/api/dashboard/kpis');
        const data = response.data;
        await this.setCache(STORAGE_KEYS.KPI, data, CACHE_DURATION.KPI);
        await this.updateLastSync();
        return { data, fromCache: false };
      } catch (error) {
        console.warn('[OfflineService] Failed to fetch KPIs, using cache');
        const cached = await this.getCached<KPIData>(STORAGE_KEYS.KPI);
        return { data: cached, fromCache: true };
      }
    }

    const cached = await this.getCached<KPIData>(STORAGE_KEYS.KPI);
    return { data: cached, fromCache: true };
  }

  // ==================== Conflicts Methods ====================

  async getConflicts(forceRefresh = false): Promise<{ data: ConflictSummary[]; fromCache: boolean }> {
    const isOnline = await this.checkOnlineStatus();

    if (!forceRefresh && !isOnline) {
      const cached = await this.getCached<ConflictSummary[]>(STORAGE_KEYS.CONFLICTS);
      return { data: cached || [], fromCache: true };
    }

    if (isOnline) {
      try {
        const response = await api.get('/api/dashboard/conflicts-urgent');
        const data = response.data;
        await this.setCache(STORAGE_KEYS.CONFLICTS, data, CACHE_DURATION.CONFLICTS);
        return { data, fromCache: false };
      } catch (error) {
        console.warn('[OfflineService] Failed to fetch conflicts, using cache');
        const cached = await this.getCached<ConflictSummary[]>(STORAGE_KEYS.CONFLICTS);
        return { data: cached || [], fromCache: true };
      }
    }

    const cached = await this.getCached<ConflictSummary[]>(STORAGE_KEYS.CONFLICTS);
    return { data: cached || [], fromCache: true };
  }

  // ==================== Tours Methods ====================

  async getActiveTours(forceRefresh = false): Promise<{ data: TourSummary[]; fromCache: boolean }> {
    const isOnline = await this.checkOnlineStatus();

    if (!forceRefresh && !isOnline) {
      const cached = await this.getCached<TourSummary[]>(STORAGE_KEYS.TOURS);
      return { data: cached || [], fromCache: true };
    }

    if (isOnline) {
      try {
        const response = await api.get('/api/dashboard/tours-active');
        const data = response.data;
        await this.setCache(STORAGE_KEYS.TOURS, data, CACHE_DURATION.TOURS);
        return { data, fromCache: false };
      } catch (error) {
        console.warn('[OfflineService] Failed to fetch tours, using cache');
        const cached = await this.getCached<TourSummary[]>(STORAGE_KEYS.TOURS);
        return { data: cached || [], fromCache: true };
      }
    }

    const cached = await this.getCached<TourSummary[]>(STORAGE_KEYS.TOURS);
    return { data: cached || [], fromCache: true };
  }

  // ==================== Action Queue Methods ====================

  async queueAction(action: Omit<QueuedAction, 'id' | 'timestamp'>): Promise<void> {
    try {
      const queue = await this.getActionQueue();
      const newAction: QueuedAction = {
        ...action,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };
      queue.push(newAction);
      await AsyncStorage.setItem(STORAGE_KEYS.ACTION_QUEUE, JSON.stringify(queue));
      console.log('[OfflineService] Action queued:', newAction);
    } catch (error) {
      console.error('[OfflineService] Error queueing action:', error);
    }
  }

  async getActionQueue(): Promise<QueuedAction[]> {
    try {
      const queue = await AsyncStorage.getItem(STORAGE_KEYS.ACTION_QUEUE);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      return [];
    }
  }

  async removeFromQueue(actionId: string): Promise<void> {
    try {
      const queue = await this.getActionQueue();
      const filtered = queue.filter(a => a.id !== actionId);
      await AsyncStorage.setItem(STORAGE_KEYS.ACTION_QUEUE, JSON.stringify(filtered));
    } catch (error) {
      console.error('[OfflineService] Error removing from queue:', error);
    }
  }

  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTION_QUEUE);
  }

  // ==================== Sync Methods ====================

  async syncQueuedActions(): Promise<{ success: number; failed: number }> {
    if (this.syncInProgress) {
      return { success: 0, failed: 0 };
    }

    const isOnline = await this.checkOnlineStatus();
    if (!isOnline) {
      return { success: 0, failed: 0 };
    }

    this.syncInProgress = true;
    let success = 0;
    let failed = 0;

    try {
      const queue = await this.getActionQueue();
      
      for (const action of queue) {
        try {
          switch (action.type) {
            case 'APPROVE_CONFLICT':
              await api.post(`/api/conflicts/${action.conflictId}/approve`, {
                notes: action.notes || 'Approuvé (sync hors-ligne)',
              });
              break;
            case 'REJECT_CONFLICT':
              await api.post(`/api/conflicts/${action.conflictId}/reject`, {
                notes: action.notes || 'Annulé (sync hors-ligne)',
              });
              break;
          }
          await this.removeFromQueue(action.id);
          success++;
        } catch (error: any) {
          console.error(`[OfflineService] Failed to sync action ${action.id}:`, error?.message);
          failed++;
        }
      }

      await this.updateLastSync();
    } finally {
      this.syncInProgress = false;
    }

    return { success, failed };
  }

  // ==================== Last Sync ====================

  async getLastSync(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  }

  async updateLastSync(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  // ==================== Clear All Cache ====================

  async clearAllCache(): Promise<void> {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  }

  // ==================== Conflict Actions ====================

  async approveConflict(conflictId: string, notes?: string): Promise<boolean> {
    const isOnline = await this.checkOnlineStatus();

    if (isOnline) {
      try {
        // Use POST /api/conflicts/:id/approve endpoint
        await api.post(`/api/conflicts/${conflictId}/approve`, {
          notes: notes || '',
        });
        return true;
      } catch (error: any) {
        console.error('[OfflineService] Error approving conflict:', error?.message);
        // If online but request failed, queue it
        await this.queueAction({
          type: 'APPROVE_CONFLICT',
          conflictId,
          notes,
        });
        return false;
      }
    } else {
      // Offline: queue the action
      await this.queueAction({
        type: 'APPROVE_CONFLICT',
        conflictId,
        notes,
      });
      return false;
    }
  }

  async rejectConflict(conflictId: string, notes?: string): Promise<boolean> {
    const isOnline = await this.checkOnlineStatus();

    if (isOnline) {
      try {
        // Use POST /api/conflicts/:id/reject endpoint
        await api.post(`/api/conflicts/${conflictId}/reject`, {
          notes: notes || 'Rejeté par la direction',
        });
        return true;
      } catch (error: any) {
        console.error('[OfflineService] Error rejecting conflict:', error?.message);
        await this.queueAction({
          type: 'REJECT_CONFLICT',
          conflictId,
          notes,
        });
        return false;
      }
    } else {
      await this.queueAction({
        type: 'REJECT_CONFLICT',
        conflictId,
        notes,
      });
      return false;
    }
  }
  
  async resolveConflict(conflictId: string, resolutionData: {
    type: 'PAIEMENT' | 'RETOUR_CAISSES';
    modePaiement?: 'ESPECES' | 'RETENUE_SALAIRE';
    quantite?: number;
    montant?: number;
    notes?: string;
  }): Promise<boolean> {
    const isOnline = await this.checkOnlineStatus();

    if (isOnline) {
      try {
        await api.post(`/api/conflicts/${conflictId}/resolve`, resolutionData);
        return true;
      } catch (error: any) {
        console.error('[OfflineService] Error resolving conflict:', error?.message);
        // For now, fall back to simple approve if resolve fails
        return this.approveConflict(conflictId, resolutionData.notes);
      }
    } else {
      // Offline: queue as approve action with notes describing resolution
      const notesSummary = resolutionData.type === 'PAIEMENT' 
        ? `Paiement ${resolutionData.modePaiement === 'ESPECES' ? 'espèces' : 'retenue salaire'} - ${resolutionData.montant} TND`
        : `Retour ${resolutionData.quantite} caisses`;
      await this.queueAction({
        type: 'APPROVE_CONFLICT',
        conflictId,
        notes: `${notesSummary}. ${resolutionData.notes || ''}`,
      });
      return false;
    }
  }
}

// Export singleton
export const offlineService = new OfflineService();
export default offlineService;
export type { KPIData, ConflictSummary, TourSummary, QueuedAction };
