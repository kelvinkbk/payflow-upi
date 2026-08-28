import test from 'node:test';
import assert from 'node:assert';
import { SessionService } from '../services/session.service.js';
import { PaymentMatcherService } from '../services/paymentMatcher.service.js';
import { getDatabase } from '../database/db.js';

test('PaymentMatcher - Exact Amount Match & State Transition', async () => {
  const db = getDatabase();

  // Create session for ₹500
  const session = SessionService.createSession({
    amount: 500,
    note: 'Test Order'
  });

  assert.strictEqual(session.status, 'WAITING_FOR_PAYMENT');
  assert.strictEqual(session.amount, 500);

  // Incoming ₹500 payment
  const result = await PaymentMatcherService.processPaymentEvent({
    amount: 500,
    currency: 'INR',
    transactionId: `UTR_TEST_${Date.now()}`,
    timestamp: new Date().toISOString(),
    source: 'notification',
    payerName: 'Vikram Singh',
    appSource: 'Google Pay'
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, 'PAYMENT_RECEIVED');
  assert.strictEqual(result.matchedSessionId, session.id);

  // Verify DB updated
  const updated = db.prepare('SELECT status FROM payment_sessions WHERE id = ?').get(session.id) as any;
  assert.strictEqual(updated.status, 'PAYMENT_RECEIVED');
});

test('PaymentMatcher - Amount Mismatch Rejection', async () => {
  // Create session for ₹500
  const session = SessionService.createSession({
    amount: 500,
    note: 'Mismatch Test'
  });

  // Attempt payment of ₹50 instead of ₹500
  const result = await PaymentMatcherService.processPaymentEvent({
    amount: 50,
    currency: 'INR',
    transactionId: `UTR_MISMATCH_${Date.now()}`,
    timestamp: new Date().toISOString(),
    source: 'notification',
    payerName: 'Fraud / Wrong Amount Sender'
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'MISMATCH_REJECTED');
  assert.strictEqual(result.expectedAmount, 500);
  assert.strictEqual(result.amount, 50);

  // Active session should remain WAITING_FOR_PAYMENT
  const current = SessionService.getCurrentActiveSession();
  assert.ok(current);
  assert.strictEqual(current.id, session.id);
  assert.strictEqual(current.status, 'WAITING_FOR_PAYMENT');
});

test('PaymentMatcher - Duplicate UTR Prevention', async () => {
  const uniqueUtr = `UTR_DUP_${Date.now()}`;

  // First payment
  SessionService.createSession({ amount: 150 });
  const result1 = await PaymentMatcherService.processPaymentEvent({
    amount: 150,
    currency: 'INR',
    transactionId: uniqueUtr,
    timestamp: new Date().toISOString(),
    source: 'notification'
  });
  assert.strictEqual(result1.success, true);

  // Second duplicate payment with same UTR
  SessionService.createSession({ amount: 150 });
  const result2 = await PaymentMatcherService.processPaymentEvent({
    amount: 150,
    currency: 'INR',
    transactionId: uniqueUtr,
    timestamp: new Date().toISOString(),
    source: 'notification'
  });

  assert.strictEqual(result2.success, false);
  assert.strictEqual(result2.status, 'DUPLICATE_REJECTED');
});
