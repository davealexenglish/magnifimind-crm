/**
 * Crypto Compatibility Test
 *
 * This test verifies that Web Crypto API and crypto-js implementations
 * produce compatible encrypted data that can be decrypted by either.
 *
 * Run this in browser console to verify before deploying to production.
 */

import CryptoJS from 'crypto-js';

/**
 * Web Crypto API implementation (copied from passwordEncryption.js)
 */
async function encryptWithWebCrypto(plaintext, masterPassword) {
  const encoder = new TextEncoder();

  // Derive key
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(masterPassword));
  const key = await crypto.subtle.importKey('raw', hash, { name: 'AES-CBC', length: 256 }, false, ['encrypt']);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(16));

  // Prepend salt to plaintext
  const plaintextBytes = encoder.encode(plaintext);
  const saltedPassword = new Uint8Array(salt.length + plaintextBytes.length);
  saltedPassword.set(salt, 0);
  saltedPassword.set(plaintextBytes, salt.length);

  // Encrypt
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, saltedPassword);

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function decryptWithWebCrypto(encryptedBase64, masterPassword) {
  const encoder = new TextEncoder();

  // Derive key
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(masterPassword));
  const key = await crypto.subtle.importKey('raw', hash, { name: 'AES-CBC', length: 256 }, false, ['decrypt']);

  // Decode
  const encryptedData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = encryptedData.slice(0, 16);
  const ciphertext = encryptedData.slice(16);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, ciphertext);
  const decryptedBytes = new Uint8Array(decrypted);

  // Remove salt (first 16 bytes)
  const passwordBytes = decryptedBytes.slice(16);

  return new TextDecoder().decode(passwordBytes);
}

/**
 * crypto-js implementation (copied from passwordEncryption.js)
 */
function encryptWithCryptoJS(plaintext, masterPassword) {
  const salt = CryptoJS.lib.WordArray.random(16);
  const iv = CryptoJS.lib.WordArray.random(16);
  const saltedPlaintext = salt.concat(CryptoJS.enc.Utf8.parse(plaintext));
  const key = CryptoJS.SHA256(masterPassword);

  const encrypted = CryptoJS.AES.encrypt(saltedPlaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  const combined = iv.concat(encrypted.ciphertext);
  return CryptoJS.enc.Base64.stringify(combined);
}

function decryptWithCryptoJS(encryptedBase64, masterPassword) {
  const encryptedData = CryptoJS.enc.Base64.parse(encryptedBase64);
  const iv = CryptoJS.lib.WordArray.create(encryptedData.words.slice(0, 4), 16);
  const ciphertext = CryptoJS.lib.WordArray.create(
    encryptedData.words.slice(4),
    encryptedData.sigBytes - 16
  );

  const key = CryptoJS.SHA256(masterPassword);
  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });

  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  const saltedPlaintext = decrypted;
  const passwordWords = CryptoJS.lib.WordArray.create(
    saltedPlaintext.words.slice(4),
    saltedPlaintext.sigBytes - 16
  );

  return CryptoJS.enc.Utf8.stringify(passwordWords);
}

/**
 * Run compatibility tests
 */
export async function runCompatibilityTest() {
  const testCases = [
    { plaintext: 'simple', masterPassword: 'master123' },
    { plaintext: 'P@ssw0rd!#$%', masterPassword: 'MyMasterKey' },
    { plaintext: 'Unicode: 日本語 émojis 🔐', masterPassword: 'test' },
    { plaintext: 'A'.repeat(1000), masterPassword: 'longpassword' }, // Long password
    { plaintext: '', masterPassword: 'empty' }, // Empty password
  ];

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Check if Web Crypto is available
  const hasWebCrypto = typeof crypto !== 'undefined' && crypto.subtle;

  console.log('='.repeat(60));
  console.log('CRYPTO COMPATIBILITY TEST');
  console.log('='.repeat(60));
  console.log(`Web Crypto API available: ${hasWebCrypto ? 'YES' : 'NO'}`);
  console.log('');

  for (const { plaintext, masterPassword } of testCases) {
    const testName = `"${plaintext.substring(0, 20)}${plaintext.length > 20 ? '...' : ''}"`;
    console.log(`Testing: ${testName}`);

    try {
      // Test 1: crypto-js encrypt -> crypto-js decrypt
      const cryptoJsEncrypted = encryptWithCryptoJS(plaintext, masterPassword);
      const cryptoJsDecrypted = decryptWithCryptoJS(cryptoJsEncrypted, masterPassword);

      if (cryptoJsDecrypted !== plaintext) {
        throw new Error(`crypto-js self-test failed: got "${cryptoJsDecrypted}"`);
      }
      console.log('  ✓ crypto-js encrypt -> crypto-js decrypt');

      if (hasWebCrypto) {
        // Test 2: Web Crypto encrypt -> Web Crypto decrypt
        const webCryptoEncrypted = await encryptWithWebCrypto(plaintext, masterPassword);
        const webCryptoDecrypted = await decryptWithWebCrypto(webCryptoEncrypted, masterPassword);

        if (webCryptoDecrypted !== plaintext) {
          throw new Error(`Web Crypto self-test failed: got "${webCryptoDecrypted}"`);
        }
        console.log('  ✓ Web Crypto encrypt -> Web Crypto decrypt');

        // Test 3: crypto-js encrypt -> Web Crypto decrypt (CRITICAL)
        const crossDecrypted1 = await decryptWithWebCrypto(cryptoJsEncrypted, masterPassword);
        if (crossDecrypted1 !== plaintext) {
          throw new Error(`Cross-decrypt failed (crypto-js -> Web Crypto): got "${crossDecrypted1}"`);
        }
        console.log('  ✓ crypto-js encrypt -> Web Crypto decrypt (CRITICAL)');

        // Test 4: Web Crypto encrypt -> crypto-js decrypt (CRITICAL)
        const crossDecrypted2 = decryptWithCryptoJS(webCryptoEncrypted, masterPassword);
        if (crossDecrypted2 !== plaintext) {
          throw new Error(`Cross-decrypt failed (Web Crypto -> crypto-js): got "${crossDecrypted2}"`);
        }
        console.log('  ✓ Web Crypto encrypt -> crypto-js decrypt (CRITICAL)');
      }

      results.passed++;

    } catch (error) {
      results.failed++;
      results.errors.push({ testName, error: error.message });
      console.log(`  ✗ FAILED: ${error.message}`);
    }

    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`RESULTS: ${results.passed} passed, ${results.failed} failed`);
  console.log('='.repeat(60));

  if (results.failed > 0) {
    console.error('COMPATIBILITY TEST FAILED - DO NOT DEPLOY TO PRODUCTION');
    return false;
  } else {
    console.log('ALL TESTS PASSED - Safe to deploy to production');
    return true;
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.runCryptoCompatibilityTest = runCompatibilityTest;
}

export default runCompatibilityTest;
