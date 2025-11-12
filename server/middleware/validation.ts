import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Middleware to handle validation errors
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorDetails = {
        path: req.path,
        method: req.method,
        body: req.body,
        errors: errors.array()
      };
      
      console.error('[Validation Error]', JSON.stringify(errorDetails, null, 2));
      
      // Return detailed error for debugging
      res.status(400).json({ 
        success: false,
        error: 'Validation failed',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        errors: errors.array().map(err => ({
          field: err.type === 'field' ? err.path : 'unknown',
          message: err.msg,
          value: err.type === 'field' ? err.value : undefined
        }))
      });
      return;
    }
    
    next();
  };
};

