// lib/__tests__/indicators.test.js
import assert from 'assert';
import { sma, ema, rsi, macd, atr, vwma } from '../indicators.js';

console.log('Running indicator tests...\n');

// Test SMA
console.log('Testing SMA...');
const prices1 = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const smaResult = sma(prices1, 5);
assert.strictEqual(smaResult.length, 7, 'SMA should return correct length');
assert.strictEqual(smaResult[0], 12, 'First SMA value should be 12');
assert.strictEqual(smaResult[smaResult.length - 1], 18, 'Last SMA value should be 18');
console.log('✓ SMA tests passed');

// Test EMA
console.log('Testing EMA...');
const prices2 = [22, 23, 24, 25, 26, 27, 28, 29, 30];
const emaResult = ema(prices2, 3);
assert.strictEqual(emaResult.length, 7, 'EMA should return correct length');
assert.ok(emaResult[0] >= 23 && emaResult[0] <= 24, 'First EMA value should be reasonable');
console.log('✓ EMA tests passed');

// Test RSI
console.log('Testing RSI...');
const prices3 = [
  44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
  45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64
];
const rsiResult = rsi(prices3, 14);
assert.ok(rsiResult.length > 0, 'RSI should return values');
assert.ok(rsiResult[0] >= 0 && rsiResult[0] <= 100, 'RSI should be between 0 and 100');
console.log('✓ RSI tests passed');

// Test MACD
console.log('Testing MACD...');
const prices4 = [];
for (let i = 0; i < 50; i++) {
  prices4.push(100 + Math.sin(i / 5) * 10);
}
const macdResult = macd(prices4, 12, 26, 9);
assert.ok(macdResult.macd.length > 0, 'MACD should return macd line');
assert.ok(macdResult.signal.length > 0, 'MACD should return signal line');
assert.ok(macdResult.histogram.length > 0, 'MACD should return histogram');
console.log('✓ MACD tests passed');

// Test ATR
console.log('Testing ATR...');
const highs = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62];
const lows = [46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60];
const closes = [47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61];
const atrResult = atr(highs, lows, closes, 14);
assert.ok(atrResult.length > 0, 'ATR should return values');
assert.ok(atrResult[0] > 0, 'ATR should be positive');
console.log('✓ ATR tests passed');

// Test VWMA
console.log('Testing VWMA...');
const prices5 = [100, 101, 102, 103, 104, 105];
const volumes = [1000, 1100, 1200, 1300, 1400, 1500];
const vwmaResult = vwma(prices5, volumes, 3);
assert.strictEqual(vwmaResult.length, 4, 'VWMA should return correct length');
assert.ok(vwmaResult[0] > 100 && vwmaResult[0] < 103, 'VWMA should be reasonable');
console.log('✓ VWMA tests passed');

// Test edge cases
console.log('Testing edge cases...');
assert.deepStrictEqual(sma([], 5), [], 'SMA should handle empty array');
assert.deepStrictEqual(sma([1, 2], 5), [], 'SMA should handle insufficient data');
assert.deepStrictEqual(ema(null, 5), [], 'EMA should handle null input');
assert.deepStrictEqual(rsi([1, 2, 3], 14), [], 'RSI should handle insufficient data');
console.log('✓ Edge case tests passed');

console.log('\n✅ All indicator tests passed!');
