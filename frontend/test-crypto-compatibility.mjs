#!/usr/bin/env node
/**
 * Crypto Compatibility Test (Node.js)
 *
 * This test verifies that Web Crypto API and crypto-js implementations
 * produce compatible encrypted data.
 *
 * Run: node test-crypto-compatibility.mjs
 */

import crypto from 'crypto';
import CryptoJS from 'crypto-js';

/**
 * Web Crypto API implementation (simulated using Node.js crypto)
 * This matches what browsers do with crypto.subtle
 */
async function encryptWithWebCrypto(plaintext, masterPassword) {
  // Derive key using SHA-256
  const hash = crypto.createHash('sha256').update(masterPassword).digest();

  // Generate random salt and IV
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);

  // Prepend salt to plaintext
  const plaintextBuffer = Buffer.from(plaintext, 'utf8');
  const saltedPassword = Buffer.concat([salt, plaintextBuffer]);

  // Encrypt with AES-256-CBC
  const cipher = crypto.createCipheriv('aes-256-cbc', hash, iv);
  const encrypted = Buffer.concat([cipher.update(saltedPassword), cipher.final()]);

  // Combine IV + ciphertext
  const combined = Buffer.concat([iv, encrypted]);

  return combined.toString('base64');
}

async function decryptWithWebCrypto(encryptedBase64, masterPassword) {
  // Derive key using SHA-256
  const hash = crypto.createHash('sha256').update(masterPassword).digest();

  // Decode
  const encryptedData = Buffer.from(encryptedBase64, 'base64');
  const iv = encryptedData.slice(0, 16);
  const ciphertext = encryptedData.slice(16);

  // Decrypt with AES-256-CBC
  const decipher = crypto.createDecipheriv('aes-256-cbc', hash, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  // Remove salt (first 16 bytes)
  const passwordBuffer = decrypted.slice(16);

  return passwordBuffer.toString('utf8');
}

/**
 * crypto-js implementation (same as in passwordEncryption.js)
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
async function runCompatibilityTest() {
  const testCases = [
    { plaintext: 'simple', masterPassword: 'master123' },
    { plaintext: 'P@ssw0rd!#$%', masterPassword: 'MyMasterKey' },
    { plaintext: 'With spaces and tabs\t!', masterPassword: 'test' },
    { plaintext: 'A'.repeat(100), masterPassword: 'longpassword' },
    { plaintext: '12345', masterPassword: 'numbers' },
  ];

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  console.log('='.repeat(60));
  console.log('CRYPTO COMPATIBILITY TEST');
  console.log('='.repeat(60));
  console.log('Testing: Web Crypto (Node.js) <-> crypto-js');
  console.log('');

  for (const { plaintext, masterPassword } of testCases) {
    const testName = `"${plaintext.substring(0, 30)}${plaintext.length > 30 ? '...' : ''}"`;
    console.log(`Testing: ${testName}`);

    try {
      // Test 1: crypto-js encrypt -> crypto-js decrypt
      const cryptoJsEncrypted = encryptWithCryptoJS(plaintext, masterPassword);
      const cryptoJsDecrypted = decryptWithCryptoJS(cryptoJsEncrypted, masterPassword);

      if (cryptoJsDecrypted !== plaintext) {
        throw new Error(`crypto-js self-test failed: got "${cryptoJsDecrypted}"`);
      }
      console.log('  ✓ crypto-js encrypt -> crypto-js decrypt');

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

      results.passed++;

    } catch (error) {
      results.failed++;
      results.errors.push({ testName, error: error.message });
      console.log(`  ✗ FAILED: ${error.message}`);
    }

    console.log('');
  }

  console.log('='.repeat(60));
  if (results.failed > 0) {
    console.log(`RESULTS: ${results.passed} passed, ${results.failed} FAILED`);
    console.log('='.repeat(60));
    console.error('\n❌ COMPATIBILITY TEST FAILED - DO NOT DEPLOY TO PRODUCTION\n');
    process.exit(1);
  } else {
    console.log(`RESULTS: ${results.passed} passed, ${results.failed} failed`);
    console.log('='.repeat(60));
    console.log('\n✅ ALL TESTS PASSED - Safe to deploy to production\n');
    process.exit(0);
  }
}

runCompatibilityTest().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
