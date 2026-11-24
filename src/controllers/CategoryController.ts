import { Request, Response, NextFunction } from 'express';
import { catalog } from '../services/catalog';
import { positiveInteger, slugParameter } from '../services/validation';
import { getFilterOptions } from '../services/FilterService';

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

// Series-site listings: /drama/country/south-korea (drakor), /drama/genre/romance, /drama/year/2025, /drama/latest
export const getDramaMovies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = positiveInteger(req.query.page, 1, 1000, 'page');
    const { category } = req.params;
    const path = category ? `drama/${category === 'years' ? 'year' : category}/${slugParameter(req.params.slug)}` : `drama/${slugParameter(req.params.slug)}`;
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

// Genre, country and year choices for the browse page: /filters/movie (LK21) or /filters/drama (series site).
export const getFilters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const site = req.params.site;
    if (site !== 'movie' && site !== 'drama') return res.status(404).json({ success: false, error: { message: 'Unknown site', status: 404 } });
    const data = await getFilterOptions(site);
    res.set('Cache-Control', 'public, max-age=3600').json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
