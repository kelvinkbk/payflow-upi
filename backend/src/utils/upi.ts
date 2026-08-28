export interface UpiUriParams {
  pa: string;        // Payee VPA / UPI ID (e.g. merchant@okaxis)
  pn: string;        // Payee Name (e.g. SuperStore Express)
  am: number | string; // Amount in INR (e.g. 500.00)
  cu?: string;       // Currency (default INR)
  tn?: string;       // Transaction Note
  tr?: string;       // Transaction Reference / Order ID
  mc?: string;       // Merchant Category Code (e.g. 5411)
  sign?: string;     // Optional digital signature
}

export class UpiUtil {
  /**
   * Validates standard Indian UPI ID (VPA)
   * Pattern: username@bank / mobile@upi / username@ybl / merchant@okaxis
   */
  public static isValidUpiId(vpa: string): boolean {
    if (!vpa || typeof vpa !== 'string') return false;
    const cleanVpa = vpa.trim();
    // Typical UPI VPA format: [a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,100}@[a-zA-Z0-9.\-_]{2,50}$/;
    return upiRegex.test(cleanVpa);
  }

  /**
   * Validates amount: positive number with max 2 decimal places, within NPCI limits (₹1 to ₹1,00,000)
   */
  public static isValidAmount(amount: number | string): boolean {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num) || !isFinite(num) || num <= 0) return false;
    if (num > 1000000) return false; // Reasonable upper threshold
    // Check max 2 decimal places
    const str = num.toString();
    const parts = str.split('.');
    if (parts.length > 1 && parts[1].length > 2) return false;
    return true;
  }

  /**
   * Formats amount to strict 2-decimal representation (e.g. 500.00)
   */
  public static formatAmount(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return Number(num).toFixed(2);
  }

  /**
   * Generates a fully compliant NPCI UPI Intent URI
   * Standard spec: upi://pay?pa=...&pn=...&am=...&cu=INR&tr=...&tn=...
   */
  public static generateUpiUri(params: UpiUriParams): string {
    if (!this.isValidUpiId(params.pa)) {
      throw new Error(`Invalid Payee UPI ID (VPA): "${params.pa}"`);
    }

    const formattedAmount = this.formatAmount(params.am);
    if (!this.isValidAmount(formattedAmount)) {
      throw new Error(`Invalid Amount: "${params.am}"`);
    }

    const urlParams = new URLSearchParams();
    urlParams.append('pa', params.pa.trim());
    urlParams.append('pn', params.pn.trim());
    urlParams.append('am', formattedAmount);
    urlParams.append('cu', params.cu || 'INR');

    if (params.tn) {
      urlParams.append('tn', params.tn.trim().substring(0, 50)); // Max 50 chars for note
    }
    if (params.tr) {
      urlParams.append('tr', params.tr.trim()); // Max 35 chars
    }
    if (params.mc) {
      urlParams.append('mc', params.mc.trim());
    }

    return `upi://pay?${urlParams.toString()}`;
  }

  /**
   * Parses a UPI URI back into parameters
   */
  public static parseUpiUri(uri: string): Partial<UpiUriParams> {
    try {
      if (!uri.startsWith('upi://pay?')) return {};
      const queryStr = uri.replace('upi://pay?', '');
      const urlParams = new URLSearchParams(queryStr);
      return {
        pa: urlParams.get('pa') || undefined,
        pn: urlParams.get('pn') || undefined,
        am: urlParams.get('am') || undefined,
        cu: urlParams.get('cu') || undefined,
        tn: urlParams.get('tn') || undefined,
        tr: urlParams.get('tr') || undefined,
        mc: urlParams.get('mc') || undefined
      };
    } catch {
      return {};
    }
  }
}
