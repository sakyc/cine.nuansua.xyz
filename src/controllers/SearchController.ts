import { Request, Response, NextFunction } from 'express';
import { catalog } from '../services/catalog';
import { positiveInteger } from '../services/validation';
import { ServiceError } from '../services/errors';

export const search = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ success: false, error: 'Query parameter q is required' });
    }
    const query = q.trim();
    if (query.length < 2 || query.length > 100 || !/[\p{L}\p{N}]/u.test(query)) {
      throw new ServiceError(400, 'q must contain 2 to 100 characters and at least one letter or number');
    }
    const page = positiveInteger(req.query.page, 1, 1000, 'page');
    const limit = positiveInteger(req.query.limit, 20, 50, 'limit');
    const { results, total, meta } = await catalog.search(query, page, limit);
    res.json({
      success: true,
      query,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      results,
      meta,
    });
  } catch (error) {
    next(error);
  }
};
