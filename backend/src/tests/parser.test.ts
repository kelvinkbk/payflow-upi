import test from 'node:test';
import assert from 'node:assert';
import { NotificationParserService } from '../services/notificationParser.service.js';

test('NotificationParser - Google Pay Notification', () => {
  const parsed = NotificationParserService.parse(
    'com.google.android.apps.nbu.paisa.user',
    'Payment received',
    'Rahul Sharma paid you ₹500.00. UPI transaction ID: 423981234567'
  );

  assert.strictEqual(parsed.isPaymentReceived, true);
  assert.strictEqual(parsed.amount, 500);
  assert.strictEqual(parsed.transactionId, '423981234567');
  assert.strictEqual(parsed.payerName, 'Rahul Sharma');
  assert.strictEqual(parsed.appSource, 'Google Pay');
});

test('NotificationParser - PhonePe Notification', () => {
  const parsed = NotificationParserService.parse(
    'com.phonepe.app',
    'PhonePe Payment',
    'Received ₹ 750 from Priya Verma. UTR: 423987123456'
  );

  assert.strictEqual(parsed.isPaymentReceived, true);
  assert.strictEqual(parsed.amount, 750);
  assert.strictEqual(parsed.transactionId, '423987123456');
  assert.strictEqual(parsed.payerName, 'Priya Verma');
  assert.strictEqual(parsed.appSource, 'PhonePe');
});

test('NotificationParser - Paytm Soundbox / App Notification', () => {
  const parsed = NotificationParserService.parse(
    'net.one97.paytm',
    'Paytm Merchant',
    '₹1,250 received via Paytm UPI from Vikram Singh. Ref: 423987123456'
  );

  assert.strictEqual(parsed.isPaymentReceived, true);
  assert.strictEqual(parsed.amount, 1250);
  assert.strictEqual(parsed.transactionId, '423987123456');
  assert.strictEqual(parsed.payerName, 'Vikram Singh');
  assert.strictEqual(parsed.appSource, 'Paytm');
});

test('NotificationParser - Bank SMS (HDFC)', () => {
  const parsed = NotificationParserService.parse(
    'com.google.android.apps.messaging',
    'HDFC Bank Alert',
    'HDFC Bank: Rs 500.00 credited to a/c **1234 on 28-08-26 by UPI-Rahul-423987123456-UPI.'
  );

  assert.strictEqual(parsed.isPaymentReceived, true);
  assert.strictEqual(parsed.amount, 500);
  assert.strictEqual(parsed.transactionId, '423987123456');
  assert.strictEqual(parsed.bankName, 'HDFC Bank');
});

test('NotificationParser - Promotional Spam Rejection', () => {
  const spam1 = NotificationParserService.parse(
    'com.phonepe.app',
    'Special Offer',
    'Get flat ₹50 cashback on your next electricity bill payment!'
  );
  assert.strictEqual(spam1.isPaymentReceived, false);

  const spam2 = NotificationParserService.parse(
    'net.one97.paytm',
    'Scratch & Win',
    'Congratulations! You won ₹100 scratch card in Paytm Gold'
  );
  assert.strictEqual(spam2.isPaymentReceived, false);
});
