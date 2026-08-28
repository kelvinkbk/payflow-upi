import { Request, Response } from 'express';
import { getDatabase } from '../database/db.js';
import { logger } from '../utils/logger.js';

export class TransactionController {
  /**
   * GET /api/transactions
   * Query transactions with optional filters and stats
   */
  public static getTransactions(req: Request, res: Response): void {
    try {
      const db = getDatabase();
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;
      const search = req.query.search as string;

      let query = 'SELECT * FROM transactions WHERE 1=1';
      const params: any[] = [];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND (transaction_id LIKE ? OR payer_name LIKE ? OR app_source LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const items = db.prepare(query).all(...params);

      // Get summary stats (total received today, total count)
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(CASE WHEN status = 'RECEIVED' THEN amount ELSE 0 END), 0) as total_volume,
          COALESCE(SUM(CASE WHEN status = 'RECEIVED' AND date(created_at) = date('now') THEN amount ELSE 0 END), 0) as today_volume,
          COALESCE(SUM(CASE WHEN status = 'RECEIVED' AND date(created_at) = date('now') THEN 1 ELSE 0 END), 0) as today_count
        FROM transactions
      `).get() as any;

      res.status(200).json({
        success: true,
        data: items,
        stats: {
          totalCount: stats.total_count || 0,
          totalVolume: stats.total_volume || 0,
          todayVolume: stats.today_volume || 0,
          todayCount: stats.today_count || 0
        },
        pagination: {
          limit,
          offset,
          hasMore: items.length === limit
        }
      });
    } catch (err: any) {
      logger.error('[TransactionController] Error querying transactions:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve transactions'
      });
    }
  }

  /**
   * GET /api/transactions/export
   * Exports transactions in CSV format
   */
  public static exportCsv(req: Request, res: Response): void {
    try {
      const db = getDatabase();
      const rows = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC').all() as any[];

      const headers = ['ID', 'Date/Time', 'Amount (INR)', 'Transaction ID / UTR', 'Status', 'Detection Source', 'Payer Name', 'UPI App', 'Bank'];
      const csvLines = [headers.join(',')];

      for (const row of rows) {
        const line = [
          `"${row.id}"`,
          `"${row.created_at}"`,
          row.amount,
          `"${row.transaction_id}"`,
          `"${row.status}"`,
          `"${row.detection_source}"`,
          `"${(row.payer_name || '').replace(/"/g, '""')}"`,
          `"${(row.app_source || '').replace(/"/g, '""')}"`,
          `"${(row.bank_name || '').replace(/"/g, '""')}"`
        ];
        csvLines.push(line.join(','));
      }

      const csvContent = csvLines.join('\n');
      const filename = `upi_transactions_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
    } catch (err: any) {
      logger.error('[TransactionController] Error exporting CSV:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to generate CSV export'
      });
    }
  }
}
