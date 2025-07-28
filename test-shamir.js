// Simple test script to verify Shamir's Secret Sharing works
import { ShamirUtils } from './src/utils/shamir.js';
import { EncryptionUtils } from './src/utils/encryption.js';

async function testShamir() {
  try {
    console.log('Testing Shamir\'s Secret Sharing...');
    
    // Generate a test AES key
    const key = await EncryptionUtils.generateKey();
    console.log('✓ Generated AES key');
    
    // Split the key into 5 shares with threshold of 3
    const shares = await ShamirUtils.splitKey(key, 3, 5);
    console.log(`✓ Split key into ${shares.length} shares`);
    
    // Test with different combinations
    const testCombinations = [
      [0, 1, 2], // First 3 shares
      [1, 2, 3], // Middle 3 shares
      [2, 3, 4], // Last 3 shares
      [0, 2, 4], // Non-consecutive shares
    ];
    
    for (const indices of testCombinations) {
      const testShares = indices.map(i => shares[i]);
      const reconstructedKey = await ShamirUtils.reconstructKey(testShares);
      
      // Verify the keys are the same by exporting both
      const originalKeyData = await EncryptionUtils.exportKey(key);
      const reconstructedKeyData = await EncryptionUtils.exportKey(reconstructedKey);
      
      const originalBytes = new Uint8Array(originalKeyData);
      const reconstructedBytes = new Uint8Array(reconstructedKeyData);
      
      const match = originalBytes.every((byte, i) => byte === reconstructedBytes[i]);
      
      if (match) {
        console.log(`✓ Reconstruction successful with shares ${indices.map(i => i+1).join(', ')}`);
      } else {
        console.log(`✗ Reconstruction failed with shares ${indices.map(i => i+1).join(', ')}`);
      }
    }
    
    // Test insufficient shares (should fail)
    try {
      await ShamirUtils.reconstructKey([shares[0], shares[1]]);
      console.log('✗ Should have failed with only 2 shares');
    } catch (error) {
      console.log('✓ Correctly failed with insufficient shares');
    }
    
    console.log('All tests completed!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run if called directly
if (typeof window === 'undefined') {
  testShamir();
}