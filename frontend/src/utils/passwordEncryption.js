/**
 * Client-Side Password Encryption/Decryption
 *
 * This module provides AES-256-CBC encryption/decryption that matches the server-side
 * implementation. The master password NEVER leaves the client.
 *
 * Security Flow:
 * 1. User provides master password in the UI (never sent to server)
 * 2. Client retrieves encrypted password from API
 * 3. Client decrypts password locally using Web Crypto API (or crypto-js fallback)
 * 4. Decrypted password displayed to user (never sent to server)
 *
 * For encryption (creating new passwords):
 * 1. User enters password and master password in UI
 * 2. Client encrypts password locally
 * 3. Client sends encrypted password to server
 * 4. Server stores encrypted password (never sees plaintext)
 *
 * Note: Uses Web Crypto API when available (HTTPS/localhost), falls back to
 * crypto-js for HTTP environments (like local development on r740).
 */

import CryptoJS from 'crypto-js';

// Check if Web Crypto API is available (requires secure context: HTTPS or localhost)
const isSecureContext = typeof crypto !== 'undefined' && crypto.subtle;

/**
 * Derive encryption key from master password using SHA-256 (Web Crypto API)
 * @param {string} masterPassword - The master password
 * @returns {Promise<CryptoKey>} - The derived encryption key
 */
async function deriveKeyWebCrypto(masterPassword) {
  const encoder = new TextEncoder();

  // Use PBKDF2 to derive a key (matching server's SHA-256)
  // Note: Server uses simple SHA-256, we'll match that behavior
  const hash = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(masterPassword)
  );

  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-CBC', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive encryption key from master password using SHA-256 (crypto-js)
 * @param {string} masterPassword - The master password
 * @returns {CryptoJS.lib.WordArray} - The derived encryption key
 */
function deriveKeyCryptoJS(masterPassword) {
  return CryptoJS.SHA256(masterPassword);
}

/**
 * Encrypt a password using AES-256-CBC with random salt and IV (Web Crypto API)
 */
async function encryptPasswordWebCrypto(plaintext, masterPassword) {
  const encoder = new TextEncoder();

  // Generate random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Prepend salt to plaintext
  const plaintextBytes = encoder.encode(plaintext);
  const saltedPassword = new Uint8Array(salt.length + plaintextBytes.length);
  saltedPassword.set(salt, 0);
  saltedPassword.set(plaintextBytes, salt.length);

  // Generate random IV (16 bytes)
  const iv = crypto.getRandomValues(new Uint8Array(16));

  // Derive encryption key
  const key = await deriveKeyWebCrypto(masterPassword);

  // Encrypt using AES-CBC
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: iv },
    key,
    saltedPassword
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Base64 encode
  return btoa(String.fromCharCode(...combined));
}

/**
 * Encrypt a password using AES-256-CBC with random salt and IV (crypto-js fallback)
 */
function encryptPasswordCryptoJS(plaintext, masterPassword) {
  // Generate random salt (16 bytes) and IV (16 bytes)
  const salt = CryptoJS.lib.WordArray.random(16);
  const iv = CryptoJS.lib.WordArray.random(16);

  // Prepend salt to plaintext
  const saltedPlaintext = salt.concat(CryptoJS.enc.Utf8.parse(plaintext));

  // Derive key from master password
  const key = deriveKeyCryptoJS(masterPassword);

  // Encrypt using AES-CBC
  const encrypted = CryptoJS.AES.encrypt(saltedPlaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  // Combine IV + ciphertext and Base64 encode
  const combined = iv.concat(encrypted.ciphertext);
  return CryptoJS.enc.Base64.stringify(combined);
}

/**
 * Encrypt a password using AES-256-CBC with random salt and IV
 * @param {string} plaintext - The password to encrypt
 * @param {string} masterPassword - The master password
 * @returns {Promise<string>} - Base64-encoded encrypted data
 */
export async function encryptPassword(plaintext, masterPassword) {
  if (!masterPassword) {
    throw new Error('Master password is required');
  }

  if (isSecureContext) {
    return encryptPasswordWebCrypto(plaintext, masterPassword);
  } else {
    return encryptPasswordCryptoJS(plaintext, masterPassword);
  }
}

/**
 * Decrypt a password using AES-256-CBC (Web Crypto API)
 */
async function decryptPasswordWebCrypto(encryptedBase64, masterPassword) {
  // Base64 decode
  const encryptedData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

  // Extract IV (first 16 bytes)
  if (encryptedData.length < 32) {
    throw new Error('Invalid encrypted data: too short');
  }

  const iv = encryptedData.slice(0, 16);
  const ciphertext = encryptedData.slice(16);

  // Derive encryption key
  const key = await deriveKeyWebCrypto(masterPassword);

  // Decrypt using AES-CBC
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: iv },
    key,
    ciphertext
  );

  const decryptedBytes = new Uint8Array(decrypted);

  // Remove salt (first 16 bytes)
  if (decryptedBytes.length < 16) {
    throw new Error('Decryption failed: invalid data');
  }

  const passwordBytes = decryptedBytes.slice(16);

  // Convert to string
  const decoder = new TextDecoder();
  return decoder.decode(passwordBytes);
}

/**
 * Decrypt a password using AES-256-CBC (crypto-js fallback)
 */
function decryptPasswordCryptoJS(encryptedBase64, masterPassword) {
  // Base64 decode to WordArray
  const encryptedData = CryptoJS.enc.Base64.parse(encryptedBase64);

  // Extract IV (first 16 bytes = 4 words)
  const iv = CryptoJS.lib.WordArray.create(encryptedData.words.slice(0, 4), 16);
  const ciphertext = CryptoJS.lib.WordArray.create(
    encryptedData.words.slice(4),
    encryptedData.sigBytes - 16
  );

  // Derive key from master password
  const key = deriveKeyCryptoJS(masterPassword);

  // Create cipher params
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: ciphertext
  });

  // Decrypt using AES-CBC
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  // Remove salt (first 16 bytes = 4 words)
  const saltedPlaintext = decrypted;
  if (saltedPlaintext.sigBytes < 16) {
    throw new Error('Decryption failed: invalid data');
  }

  const passwordWords = CryptoJS.lib.WordArray.create(
    saltedPlaintext.words.slice(4),
    saltedPlaintext.sigBytes - 16
  );

  // Convert to string
  return CryptoJS.enc.Utf8.stringify(passwordWords);
}

/**
 * Decrypt a password using AES-256-CBC
 * @param {string} encryptedBase64 - Base64-encoded encrypted data
 * @param {string} masterPassword - The master password
 * @returns {Promise<string>} - The decrypted password
 */
export async function decryptPassword(encryptedBase64, masterPassword) {
  if (!masterPassword) {
    throw new Error('Master password is required');
  }

  try {
    if (isSecureContext) {
      return await decryptPasswordWebCrypto(encryptedBase64, masterPassword);
    } else {
      return decryptPasswordCryptoJS(encryptedBase64, masterPassword);
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Decryption failed - check master password');
  }
}

/**
 * Verify if a master password is correct by attempting to decrypt
 * @param {string} encryptedPassword - Base64-encoded encrypted password
 * @param {string} masterPassword - The master password to verify
 * @returns {Promise<boolean>} - True if master password is correct
 */
export async function verifyMasterPassword(encryptedPassword, masterPassword) {
  try {
    await decryptPassword(encryptedPassword, masterPassword);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Example Usage:
 *
 * // Encrypting (when creating a new password)
 * const encrypted = await encryptPassword('myPassword123', 'masterPass');
 * // Send encrypted to server via API
 *
 * // Decrypting (when viewing a password)
 * const encryptedFromAPI = response.data.password; // Get from server
 * const decrypted = await decryptPassword(encryptedFromAPI, 'masterPass');
 * // Display decrypted to user
 */
