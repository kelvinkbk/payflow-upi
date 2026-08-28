import { logger } from '../utils/logger.js';

export interface ParsedUpiNotification {
  isPaymentReceived: boolean;
  amount?: number;
  currency?: string;
  transactionId?: string; // UTR or Ref number
  payerName?: string;
  payerVpa?: string;
  appSource?: string;
  bankName?: string;
  confidence: number; // 0.0 to 1.0
  rawNotification: string;
}

export class NotificationParserService {
  // Negative keywords indicating promotional, debt reminder, or outgoing payment
  private static readonly PROMOTIONAL_OR_OUTGOING_PATTERNS = [
    /\b(cashback|scratch card|won|winner|discount|coupon|offer|flat off)\b/i,
    /\b(debited|sent to|paid to|transferred to|recharge of|bill due|reminder)\b/i,
    /\b(recharge successful|order placed|ticket booked|movie ticket)\b/i,
    /\b(apply now|pre-approved|loan|credit card offer)\b/i
  ];

  /**
   * Parses raw notification title and text received from Android NotificationListenerService
   */
  public static parse(
    packageName: string,
    title: string,
    text: string,
    subText?: string
  ): ParsedUpiNotification {
    const rawTitle = (title || '').trim();
    const rawContent = (text || '').trim();
    const fullText = `${rawTitle} ${rawContent} ${subText || ''}`.trim();

    const result: ParsedUpiNotification = {
      isPaymentReceived: false,
      currency: 'INR',
      confidence: 0,
      rawNotification: fullText
    };

    if (!fullText) return result;

    // Filter out obvious spam / promo / outgoing
    for (const pattern of this.PROMOTIONAL_OR_OUTGOING_PATTERNS) {
      if (pattern.test(fullText)) {
        logger.debug(`[NotificationParser] Rejected notification as promotional/outgoing: "${fullText}"`);
        return result;
      }
    }

    // Determine App Source from package name & content
    result.appSource = this.identifyAppSource(packageName, fullText);
    result.bankName = this.identifyBank(packageName, fullText);

    // Extract Amount (supports ₹, Rs, Rs., INR, INR.)
    const amountRegex = /(?:₹|Rs\.?|INR)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i;
    const amountMatch = fullText.match(amountRegex);
    if (amountMatch && amountMatch[1]) {
      const cleanAmount = amountMatch[1].replace(/,/g, '');
      const parsedAmount = parseFloat(cleanAmount);
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        result.amount = parsedAmount;
      }
    }

    // Check for "received" / "credited" / "paid you" indicators
    const receivedKeywords = [
      /\breceived\b/i,
      /\bcredited\b/i,
      /\bpaid you\b/i,
      /\bprapt hue\b/i,
      /\bcredit by\b/i,
      /\bcredited with\b/i,
      /\bcredited to\b/i,
      /\btransferred to your\b/i
    ];

    const hasReceivedKeyword = receivedKeywords.some((regex) => regex.test(fullText));

    if (!result.amount || !hasReceivedKeyword) {
      return result;
    }

    // Extract UTR / Transaction ID (12 digit numeric or alphanumeric ref)
    const utrPatterns = [
      /\b(?:UTR|Ref|Reference|Txn(?:\s*ID)?|transaction\s*ID|UPI\s*Ref(?:\s*No)?|RRR)\s*[:#\-\s]\s*([A-Za-z0-9]{8,22})\b/i,
      /\bUPI(?:\/CR)?\/([0-9]{12})\b/i,
      /\b([0-9]{12})\b/
    ];

    for (const pattern of utrPatterns) {
      const utrMatch = fullText.match(pattern);
      if (utrMatch && utrMatch[1]) {
        result.transactionId = utrMatch[1].trim();
        break;
      }
    }

    // If no explicit UTR found, generate deterministic fallback hash based on content & 30s bucket
    if (!result.transactionId) {
      const timeBucket = Math.floor(Date.now() / 30000);
      result.transactionId = `NOTIF_${timeBucket}_${Math.round(result.amount * 100)}`;
    }

    // Extract Payer Name from text or fullText
    // Pattern 1: "<PayerName> paid you" (check text first)
    const paidYouMatch = rawContent.match(/([A-Za-z\s]{2,35}?)\s+paid\s+you/i) || fullText.match(/([A-Za-z\s]{2,35}?)\s+paid\s+you/i);
    if (paidYouMatch && paidYouMatch[1]) {
      let candidate = paidYouMatch[1].replace(/payment\s+received/gi, '').replace(/payment/gi, '').trim();
      if (candidate.length >= 2) {
        result.payerName = candidate;
      }
    }

    // Pattern 2: "from <PayerName>" or "by <PayerName>"
    if (!result.payerName) {
      const payerFromRegex = /(?:from|by)\s+([A-Za-z\s]{2,30}?)(?:\s+on|\s+via|\s+in|\s+using|\.|\(|$)/i;
      const payerFromMatch = rawContent.match(payerFromRegex) || fullText.match(payerFromRegex);
      if (payerFromMatch && payerFromMatch[1]) {
        const candidate = payerFromMatch[1].replace(/payment/gi, '').trim();
        if (!candidate.toLowerCase().includes('bank') && !candidate.toLowerCase().includes('upi') && candidate.length >= 2) {
          result.payerName = candidate;
        }
      }
    }

    // Extract VPA handle if present
    const vpaRegex = /([a-zA-Z0-9.\-_]{2,50}@[a-zA-Z0-9]{2,30})/;
    const vpaMatch = fullText.match(vpaRegex);
    if (vpaMatch && vpaMatch[1]) {
      result.payerVpa = vpaMatch[1];
    }

    result.isPaymentReceived = true;
    result.confidence = result.transactionId && result.amount ? 0.95 : 0.8;

    return result;
  }

  private static identifyAppSource(pkg: string, text: string): string {
    const p = pkg.toLowerCase();
    const t = text.toLowerCase();

    if (p.includes('paisa') || p.includes('nbu') || t.includes('google pay') || t.includes('gpay')) return 'Google Pay';
    if (p.includes('phonepe') || t.includes('phonepe')) return 'PhonePe';
    if (p.includes('paytm') || t.includes('paytm')) return 'Paytm';
    if (p.includes('upiapp') || p.includes('npci') || t.includes('bhim')) return 'BHIM UPI';
    if (p.includes('amazon') || t.includes('amazon pay')) return 'Amazon Pay';
    if (p.includes('cred') || t.includes('cred')) return 'CRED';
    if (p.includes('mms') || p.includes('messaging') || p.includes('sms')) return 'Bank SMS';
    return 'UPI App';
  }

  private static identifyBank(pkg: string, text: string): string | undefined {
    const t = text.toUpperCase();
    if (t.includes('HDFC')) return 'HDFC Bank';
    if (t.includes('SBI') || t.includes('STATE BANK')) return 'State Bank of India';
    if (t.includes('ICICI')) return 'ICICI Bank';
    if (t.includes('AXIS')) return 'Axis Bank';
    if (t.includes('KOTAK')) return 'Kotak Mahindra Bank';
    if (t.includes('PNB') || t.includes('PUNJAB NATIONAL')) return 'Punjab National Bank';
    if (t.includes('BOB') || t.includes('BANK OF BARODA')) return 'Bank of Baroda';
    if (t.includes('YES BANK')) return 'Yes Bank';
    if (t.includes('IDFC')) return 'IDFC FIRST Bank';
    return undefined;
  }
}
