import test from 'node:test';
import assert from 'node:assert';
import { UpiUtil } from '../utils/upi.js';

test('UpiUtil - UPI ID Validation', () => {
  assert.strictEqual(UpiUtil.isValidUpiId('merchant@okaxis'), true);
  assert.strictEqual(UpiUtil.isValidUpiId('shop9876@upi'), true);
  assert.strictEqual(UpiUtil.isValidUpiId('user.name-123@icici'), true);
  assert.strictEqual(UpiUtil.isValidUpiId('invalid-upi'), false);
  assert.strictEqual(UpiUtil.isValidUpiId('@okaxis'), false);
  assert.strictEqual(UpiUtil.isValidUpiId(''), false);
});

test('UpiUtil - Amount Validation and Formatting', () => {
  assert.strictEqual(UpiUtil.isValidAmount(500), true);
  assert.strictEqual(UpiUtil.isValidAmount('500.50'), true);
  assert.strictEqual(UpiUtil.isValidAmount(0), false);
  assert.strictEqual(UpiUtil.isValidAmount(-50), false);
  assert.strictEqual(UpiUtil.isValidAmount('500.555'), false); // More than 2 decimals

  assert.strictEqual(UpiUtil.formatAmount(500), '500.00');
  assert.strictEqual(UpiUtil.formatAmount('12.5'), '12.50');
});

test('UpiUtil - NPCI UPI Intent URI Generation', () => {
  const uri = UpiUtil.generateUpiUri({
    pa: 'merchant@okaxis',
    pn: 'SuperStore Express',
    am: 500,
    cu: 'INR',
    tn: 'Bill Payment',
    tr: 'ORD_12345678'
  });

  assert.ok(uri.startsWith('upi://pay?'));
  assert.ok(uri.includes('pa=merchant%40okaxis'));
  assert.ok(uri.includes('pn=SuperStore+Express') || uri.includes('pn=SuperStore%20Express'));
  assert.ok(uri.includes('am=500.00'));
  assert.ok(uri.includes('cu=INR'));
  assert.ok(uri.includes('tr=ORD_12345678'));
});
