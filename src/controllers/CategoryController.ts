import { Request, Response, NextFunction } from 'express';
import { catalog } from '../services/catalog';
import { positiveInteger, slugParameter } from '../services/validation';

// Handles genre, country, year
export const getCategoryMovies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { category, slug } = req.params; // category can be 'genre', 'country', 'years'
    slug = slugParameter(slug);
    const page = positiveInteger(req.query.page, 1, 1000, 'page');
    
    // LK21 uses 'year' not 'years'
    if (category === 'years') category = 'year';
    
    // Construct path for LK21. e.g., 'genre/action' or 'country/indonesia'
    const path = `${category}/${slug}`;
    
    const { data, meta } = await catalog.getCategory(path, page);
    res.json({ success: true, ...data, meta });
  } catch (error) {
    next(error);
  }
};

// Handles root categories like popular, rating, release, etc.
export const getRootCategoryMovies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = slugParameter(req.params.slug);
    const page = positiveInteger(req.query.page, 1, 1000, 'page');
    
    const { data, meta } = await catalog.getCategory(slug, page);
    res.json({ success: true, ...data, meta });
  } catch (error) {
    next(error);
  }
};
