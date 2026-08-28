export const logger = {
  info: (msg: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${msg}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (msg: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] \x1b[33m${msg}\x1b[0m`, meta ? JSON.stringify(meta) : '');
  },
  error: (msg: string, err?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] \x1b[31m${msg}\x1b[0m`, err || '');
  },
  debug: (msg: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [DEBUG] ${msg}`, meta ? JSON.stringify(meta) : '');
    }
  }
};
