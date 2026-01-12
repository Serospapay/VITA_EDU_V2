import { Request, Response, NextFunction } from 'express';

/**
 * Sanitize string - видаляє потенційно небезпечні символи
 */
const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return str;
  
  return str
    // Видаляємо HTML теги
    .replace(/<[^>]*>/g, '')
    // Видаляємо потенційно небезпечні символи
    .replace(/[<>\"']/g, '')
    // Trim пробілів
    .trim();
};

/**
 * Sanitize об'єкта рекурсивно
 */
const sanitizeObject = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Не санітизуємо паролі та токени
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret')) {
        sanitized[key] = value;
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Middleware для sanitization вхідних даних
 * Видаляє HTML теги та потенційно небезпечні символи
 */
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body) as typeof req.body;
  }
  
  // Sanitize query parameters (тільки string значення)
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeString(value);
      }
    }
  }
  
  // Sanitize params (тільки string значення)
  if (req.params) {
    for (const [key, value] of Object.entries(req.params)) {
      if (typeof value === 'string') {
        req.params[key] = sanitizeString(value);
      }
    }
  }
  
  next();
};
