import { EncryptionResult } from '../types';

export interface DeadManSwitchConfig {
  id: string;
  timeoutPeriod: number; // in milliseconds
  finalMessage: string;
  encryptionResult: EncryptionResult;
  releaseShares: number; // number of shares to release
  createdAt: number;
  lastCheckedIn: number;
  isActive: boolean;
  hasTriggered: boolean;
}

export interface CheckInResult {
  success: boolean;
  timeRemaining: number;
  isExpired: boolean;
}

export class DeadManSwitch {
  private static readonly STORAGE_KEY = 'deadshare_deadman_switches';

  /**
   * Creates a new dead man switch
   * @param config - Configuration for the dead man switch
   * @returns string - The ID of the created switch
   */
  static createSwitch(config: Omit<DeadManSwitchConfig, 'id' | 'createdAt' | 'lastCheckedIn' | 'isActive' | 'hasTriggered'>): string {
    const id = this.generateId();
    const now = Date.now();
    
    const switchConfig: DeadManSwitchConfig = {
      id,
      ...config,
      createdAt: now,
      lastCheckedIn: now,
      isActive: true,
      hasTriggered: false,
    };

    this.saveSwitch(switchConfig);
    return id;
  }

  /**
   * Checks in to reset the timer for a dead man switch
   * @param switchId - ID of the switch to check in to
   * @returns CheckInResult - Result of the check-in attempt
   */
  static checkIn(switchId: string): CheckInResult {
    const switchConfig = this.getSwitch(switchId);
    if (!switchConfig) {
      return { success: false, timeRemaining: 0, isExpired: true };
    }

    if (!switchConfig.isActive || switchConfig.hasTriggered) {
      return { success: false, timeRemaining: 0, isExpired: true };
    }

    const now = Date.now();
    const timeElapsed = now - switchConfig.lastCheckedIn;
    const timeRemaining = switchConfig.timeoutPeriod - timeElapsed;

    if (timeRemaining <= 0) {
      // Switch has expired
      switchConfig.hasTriggered = true;
      this.saveSwitch(switchConfig);
      this.triggerRelease(switchConfig);
      return { success: false, timeRemaining: 0, isExpired: true };
    }

    // Update last check-in time
    switchConfig.lastCheckedIn = now;
    this.saveSwitch(switchConfig);

    return { success: true, timeRemaining, isExpired: false };
  }

  /**
   * Gets all active switches
   * @returns DeadManSwitchConfig[] - Array of active switches
   */
  static getActiveSwitches(): DeadManSwitchConfig[] {
    const switches = this.getAllSwitches();
    return switches.filter(s => s.isActive && !s.hasTriggered);
  }

  /**
   * Gets a specific switch by ID
   * @param switchId - ID of the switch to retrieve
   * @returns DeadManSwitchConfig | null - The switch configuration or null if not found
   */
  static getSwitch(switchId: string): DeadManSwitchConfig | null {
    const switches = this.getAllSwitches();
    return switches.find(s => s.id === switchId) || null;
  }

  /**
   * Deactivates a dead man switch
   * @param switchId - ID of the switch to deactivate
   * @returns boolean - True if successfully deactivated
   */
  static deactivateSwitch(switchId: string): boolean {
    const switchConfig = this.getSwitch(switchId);
    if (!switchConfig) return false;

    switchConfig.isActive = false;
    this.saveSwitch(switchConfig);
    return true;
  }

  /**
   * Checks all switches for expiration and triggers releases if needed
   * @returns string[] - Array of IDs of switches that were triggered
   */
  static checkAllSwitches(): string[] {
    const activeSwitches = this.getActiveSwitches();
    const triggeredSwitches: string[] = [];

    activeSwitches.forEach(switchConfig => {
      const now = Date.now();
      const timeElapsed = now - switchConfig.lastCheckedIn;
      
      if (timeElapsed >= switchConfig.timeoutPeriod) {
        switchConfig.hasTriggered = true;
        this.saveSwitch(switchConfig);
        this.triggerRelease(switchConfig);
        triggeredSwitches.push(switchConfig.id);
      }
    });

    return triggeredSwitches;
  }

  /**
   * Gets time remaining for a specific switch
   * @param switchId - ID of the switch
   * @returns number - Time remaining in milliseconds, or 0 if expired/not found
   */
  static getTimeRemaining(switchId: string): number {
    const switchConfig = this.getSwitch(switchId);
    if (!switchConfig || !switchConfig.isActive || switchConfig.hasTriggered) {
      return 0;
    }

    const now = Date.now();
    const timeElapsed = now - switchConfig.lastCheckedIn;
    const timeRemaining = switchConfig.timeoutPeriod - timeElapsed;

    return Math.max(0, timeRemaining);
  }

  /**
   * Formats time remaining as human-readable string
   * @param milliseconds - Time in milliseconds
   * @returns string - Formatted time string
   */
  static formatTimeRemaining(milliseconds: number): string {
    if (milliseconds <= 0) return 'Expired';

    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Gets triggered switches that can be accessed
   * @returns DeadManSwitchConfig[] - Array of triggered switches
   */
  static getTriggeredSwitches(): DeadManSwitchConfig[] {
    const switches = this.getAllSwitches();
    return switches.filter(s => s.hasTriggered);
  }

  /**
   * Triggers the release for a dead man switch
   * @param switchConfig - The switch configuration to trigger
   */
  private static triggerRelease(switchConfig: DeadManSwitchConfig): void {
    // Store the triggered release data
    const releaseData = {
      id: switchConfig.id,
      triggeredAt: Date.now(),
      finalMessage: switchConfig.finalMessage,
      encryptionResult: switchConfig.encryptionResult,
      releaseShares: switchConfig.releaseShares,
    };

    const releases = this.getTriggeredReleases();
    releases.push(releaseData);
    localStorage.setItem('deadshare_triggered_releases', JSON.stringify(releases));

    // Show notification if possible
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('DeadShare: Dead Man Switch Triggered', {
        body: `A dead man switch has been triggered. Check the app for released content.`,
        icon: '/favicon.ico',
      });
    }
  }

  /**
   * Gets all triggered releases
   * @returns any[] - Array of triggered release data
   */
  static getTriggeredReleases(): any[] {
    try {
      const data = localStorage.getItem('deadshare_triggered_releases');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clears a triggered release
   * @param releaseId - ID of the release to clear
   */
  static clearTriggeredRelease(releaseId: string): void {
    const releases = this.getTriggeredReleases();
    const filtered = releases.filter(r => r.id !== releaseId);
    localStorage.setItem('deadshare_triggered_releases', JSON.stringify(filtered));
  }

  /**
   * Request notification permission
   * @returns Promise<NotificationPermission> - The permission status
   */
  static async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  }

  /**
   * Saves a switch configuration to localStorage
   * @param switchConfig - The switch configuration to save
   */
  private static saveSwitch(switchConfig: DeadManSwitchConfig): void {
    const switches = this.getAllSwitches();
    const existingIndex = switches.findIndex(s => s.id === switchConfig.id);
    
    if (existingIndex >= 0) {
      switches[existingIndex] = switchConfig;
    } else {
      switches.push(switchConfig);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(switches));
  }

  /**
   * Gets all switches from localStorage
   * @returns DeadManSwitchConfig[] - Array of all switches
   */
  private static getAllSwitches(): DeadManSwitchConfig[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Generates a unique ID for a switch
   * @returns string - Unique identifier
   */
  private static generateId(): string {
    return `dms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Predefined timeout periods in milliseconds
   */
  static readonly TIMEOUT_PRESETS = {
    FIFTEEN_MINUTES: 15 * 60 * 1000,
    ONE_HOUR: 60 * 60 * 1000,
    FOUR_HOURS: 4 * 60 * 60 * 1000,
    ONE_DAY: 24 * 60 * 60 * 1000,
    THREE_DAYS: 3 * 24 * 60 * 60 * 1000,
    ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
    TWO_WEEKS: 14 * 24 * 60 * 60 * 1000,
    ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
  };

  /**
   * Gets a human-readable name for timeout period
   * @param milliseconds - Timeout period in milliseconds
   * @returns string - Human-readable name
   */
  static getTimeoutName(milliseconds: number): string {
    const presets = Object.entries(this.TIMEOUT_PRESETS);
    const match = presets.find(([_, value]) => value === milliseconds);
    return match ? match[0].replace(/_/g, ' ').toLowerCase() : 'custom';
  }
}