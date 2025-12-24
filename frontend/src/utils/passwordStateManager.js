/**
 * Password State Manager
 *
 * Manages the state machine for password entries to ensure:
 * 1. Passwords are encrypted exactly once before saving
 * 2. Master password never leaves the client
 * 3. Clear tracking of encrypted vs decrypted state
 * 4. Proper handling of edits and updates
 *
 * Password States:
 * - ENCRYPTED: Password is encrypted (as retrieved from API)
 * - DECRYPTED: Password has been decrypted for viewing
 * - MODIFIED_DECRYPTED: Decrypted password has been edited
 * - NEW: Brand new password being created (plaintext)
 *
 * State Transitions:
 * ENCRYPTED --[decrypt with master password]--> DECRYPTED
 * DECRYPTED --[user edits]--> MODIFIED_DECRYPTED
 * MODIFIED_DECRYPTED --[save]--> encrypt once --> send to server --> ENCRYPTED
 * NEW --[save]--> encrypt once --> send to server --> ENCRYPTED
 * ANY --[cancel]--> revert to original state
 */

import { encryptPassword, decryptPassword } from './passwordEncryption';

// Password entry states
export const PasswordState = {
  ENCRYPTED: 'ENCRYPTED',           // Encrypted, as stored in database
  DECRYPTED: 'DECRYPTED',           // Decrypted for viewing (read-only)
  MODIFIED_DECRYPTED: 'MODIFIED_DECRYPTED', // Decrypted and edited
  NEW: 'NEW'                        // New password (plaintext, not yet encrypted)
};

/**
 * Represents a password entry with state tracking
 */
export class PasswordEntry {
  constructor(data = {}) {
    this.id = data.id || null;
    this.description = data.description || '';
    this.name = data.name || '';
    this.password = data.password || ''; // Can be encrypted or decrypted depending on state
    this.optionalLink = data.optionalLink || null;
    this.linkUrl = data.linkUrl || '';
    this.state = data.state || PasswordState.ENCRYPTED;

    // Track original encrypted value for cancel/revert
    this.originalEncrypted = data.state === PasswordState.ENCRYPTED ? data.password : null;

    // Track original values for dirty checking
    this.originalDescription = data.description || '';
    this.originalName = data.name || '';
    this.originalLinkUrl = data.linkUrl || '';
  }

  /**
   * Check if password is currently encrypted
   */
  isEncrypted() {
    return this.state === PasswordState.ENCRYPTED;
  }

  /**
   * Check if password is currently decrypted
   */
  isDecrypted() {
    return this.state === PasswordState.DECRYPTED ||
           this.state === PasswordState.MODIFIED_DECRYPTED;
  }

  /**
   * Check if password has been modified
   */
  isModified() {
    return this.state === PasswordState.MODIFIED_DECRYPTED ||
           this.description !== this.originalDescription ||
           this.name !== this.originalName ||
           this.linkUrl !== this.originalLinkUrl;
  }

  /**
   * Check if this is a new password
   */
  isNew() {
    return this.state === PasswordState.NEW;
  }

  /**
   * Decrypt the password
   * @param {string} masterPassword - User's master password
   * @returns {Promise<void>}
   * @throws {Error} If decryption fails or password not in ENCRYPTED state
   */
  async decrypt(masterPassword) {
    if (this.state !== PasswordState.ENCRYPTED) {
      throw new Error(`Cannot decrypt password in state: ${this.state}`);
    }

    try {
      const decrypted = await decryptPassword(this.password, masterPassword);
      this.password = decrypted;
      this.state = PasswordState.DECRYPTED;
    } catch (error) {
      throw new Error('Decryption failed - incorrect master password');
    }
  }

  /**
   * Mark password as modified (called when user edits decrypted password)
   */
  markAsModified() {
    if (this.state === PasswordState.DECRYPTED) {
      this.state = PasswordState.MODIFIED_DECRYPTED;
    }
  }

  /**
   * Update password value (and mark as modified if decrypted)
   * @param {string} newPassword - New password value
   */
  updatePassword(newPassword) {
    this.password = newPassword;
    if (this.state === PasswordState.DECRYPTED) {
      this.state = PasswordState.MODIFIED_DECRYPTED;
    }
  }

  /**
   * Prepare for save - encrypt if needed
   * @param {string} masterPassword - User's master password
   * @returns {Promise<Object>} - Object ready to send to API
   */
  async prepareForSave(masterPassword) {
    const payload = {
      description: this.description,
      name: this.name,
      optionalLink: this.optionalLink,
      linkUrl: this.linkUrl || null
    };

    // Determine if we need to encrypt the password
    const needsEncryption =
      this.state === PasswordState.NEW ||
      this.state === PasswordState.MODIFIED_DECRYPTED ||
      this.state === PasswordState.DECRYPTED; // Even if not modified, re-encrypt on explicit save

    if (needsEncryption) {
      // Password is in plaintext, encrypt it exactly once
      payload.password = await encryptPassword(this.password, masterPassword);
    } else if (this.state === PasswordState.ENCRYPTED) {
      // Password is already encrypted, use as-is (for metadata-only updates)
      payload.password = this.password;
    }

    return payload;
  }

  /**
   * Cancel changes and revert to original state
   */
  cancel() {
    if (this.state === PasswordState.NEW) {
      // Can't really cancel a new password, but reset it
      this.password = '';
      this.description = '';
      this.name = '';
      this.optionalLink = null;
      this.linkUrl = '';
    } else {
      // Revert to original encrypted state
      this.password = this.originalEncrypted;
      this.description = this.originalDescription;
      this.name = this.originalName;
      this.linkUrl = this.originalLinkUrl;
      this.state = PasswordState.ENCRYPTED;
    }
  }

  /**
   * Lock (re-encrypt) the password
   * Must be in decrypted state
   */
  lock() {
    if (this.isDecrypted() && this.originalEncrypted) {
      this.password = this.originalEncrypted;
      this.state = PasswordState.ENCRYPTED;
    }
  }

  /**
   * Create a new password entry
   * @param {Object} data - Initial data
   * @returns {PasswordEntry}
   */
  static createNew(data = {}) {
    return new PasswordEntry({
      ...data,
      state: PasswordState.NEW
    });
  }

  /**
   * Create from API response
   * @param {Object} apiData - Data from API
   * @returns {PasswordEntry}
   */
  static fromAPI(apiData) {
    return new PasswordEntry({
      id: apiData.id,
      description: apiData.descr,
      name: apiData.name,
      password: apiData.passwd,
      optionalLink: apiData.optLinkId,
      linkUrl: apiData.linkUrl || '',
      state: PasswordState.ENCRYPTED
    });
  }

  /**
   * Convert to API format
   * @returns {Object}
   */
  toAPI() {
    return {
      id: this.id,
      descr: this.description,
      name: this.name,
      passwd: this.password,
      optLinkId: this.optionalLink,
      linkUrl: this.linkUrl
    };
  }
}

/**
 * Manages a collection of password entries
 */
export class PasswordCollection {
  constructor() {
    this.entries = new Map(); // id -> PasswordEntry
    this.masterPassword = null; // Cached master password (optional, cleared after use)
  }

  /**
   * Add a password entry
   * @param {PasswordEntry} entry
   */
  add(entry) {
    // If entry doesn't have an ID, generate a temporary one and assign it
    if (!entry.id) {
      entry.id = `new-${Date.now()}`;
    }
    this.entries.set(entry.id, entry);
  }

  /**
   * Get a password entry by ID
   * @param {string|number} id
   * @returns {PasswordEntry|null}
   */
  get(id) {
    return this.entries.get(id) || null;
  }

  /**
   * Remove a password entry
   * @param {string|number} id
   */
  remove(id) {
    this.entries.delete(id);
  }

  /**
   * Get all entries
   * @returns {PasswordEntry[]}
   */
  getAll() {
    return Array.from(this.entries.values());
  }

  /**
   * Get all entries in a specific state
   * @param {string} state - PasswordState value
   * @returns {PasswordEntry[]}
   */
  getByState(state) {
    return this.getAll().filter(entry => entry.state === state);
  }

  /**
   * Decrypt all encrypted entries
   * @param {string} masterPassword
   * @returns {Promise<{success: number, failed: number}>}
   */
  async decryptAll(masterPassword) {
    const encrypted = this.getByState(PasswordState.ENCRYPTED);
    let success = 0;
    let failed = 0;

    for (const entry of encrypted) {
      try {
        await entry.decrypt(masterPassword);
        success++;
      } catch (error) {
        console.error(`Failed to decrypt password ${entry.id}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Lock (re-encrypt) all decrypted entries
   */
  lockAll() {
    this.getAll().forEach(entry => {
      if (entry.isDecrypted()) {
        entry.lock();
      }
    });
  }

  /**
   * Get count of entries by state
   * @returns {Object} - State counts
   */
  getStateCounts() {
    const counts = {
      [PasswordState.ENCRYPTED]: 0,
      [PasswordState.DECRYPTED]: 0,
      [PasswordState.MODIFIED_DECRYPTED]: 0,
      [PasswordState.NEW]: 0
    };

    this.getAll().forEach(entry => {
      counts[entry.state]++;
    });

    return counts;
  }

  /**
   * Check if any entries are modified
   * @returns {boolean}
   */
  hasModified() {
    return this.getAll().some(entry => entry.isModified());
  }

  /**
   * Clear cached master password
   */
  clearMasterPassword() {
    this.masterPassword = null;
  }

  /**
   * Load entries from API response
   * @param {Array} apiData - Array of password data from API
   */
  loadFromAPI(apiData) {
    this.entries.clear();
    apiData.forEach(data => {
      this.add(PasswordEntry.fromAPI(data));
    });
  }
}

/**
 * Example Usage:
 *
 * // Initialize collection
 * const passwords = new PasswordCollection();
 *
 * // Load from API
 * const response = await fetch('/api/v1/passwords');
 * const data = await response.json();
 * passwords.loadFromAPI(data.passwords);
 *
 * // User provides master password
 * const masterPassword = prompt('Enter master password:');
 *
 * // Decrypt specific password
 * const entry = passwords.get(123);
 * await entry.decrypt(masterPassword);
 * console.log(entry.password); // Decrypted!
 *
 * // User edits password
 * entry.updatePassword('newPassword123');
 *
 * // Save changes (encrypts exactly once)
 * const payload = await entry.prepareForSave(masterPassword);
 * await fetch(`/api/v1/passwords/${entry.id}`, {
 *   method: 'PUT',
 *   body: JSON.stringify(payload)
 * });
 *
 * // Cancel changes
 * entry.cancel(); // Reverts to encrypted state
 */
