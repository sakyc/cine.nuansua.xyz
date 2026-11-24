import { BaseScraper } from './BaseScraper';
import { CatalogCard, emptyExtraDetails, isCatalogCard } from '../types/catalog';

export type FilterOption = { slug: string; name: string };
export type FilterOptions = { genres: FilterOption[]; countries: FilterOption[]; years: number[] };

export class CategoryScraper extends BaseScraper {
  /**
   * Reads the genre, country and year choices from the site's filter form. Their values are the
   * slugs of the matching listings (genre/<slug>, country/<slug>, year/<year>).
   */
  async scrapeFilterOptions(): Promise<FilterOptions> {
    const $ = await this.fetchHtml('/populer/');
    const options = (name: string): FilterOption[] => {
      const seen = new Set<string>();
      return $(`form.form-filter select[name="${name}"] option, select[name="${name}"] option`).toArray()
        .map(option => ({ slug: ($(option).attr('value') || '').trim(), name: $(option).text().trim() }))
        .filter(option => /^[a-z0-9][a-z0-9-]{0,60}$/.test(option.slug) && option.name && !seen.has(option.slug) && !!seen.add(option.slug));
    };
    const years = options('tahun').map(option => Number(option.slug)).filter(year => Number.isInteger(year) && year >= 1900 && year <= 2100);
    return { genres: options('genre1'), countries: options('country'), years: [...new Set(years)].sort((a, b) => b - a) };
  }
  async scrapeCategory(path: string, page: number = 1) {
    // Determine the url to fetch based on the path. 
    // Examples of path: 'populer', 'komen-terbanyak', 'genre/action', 'country/indonesia', 'year/2023'
    const endpoint = page > 1 ? `/${path}/page/${page}/` : `/${path}/`;
    
    const $ = await this.fetchHtml(endpoint);
    const items: CatalogCard[] = [];

    $('article, .item').each((_, el) => {
      const link = $(el).find('a').attr('href');
      const title = $(el).find('h2, .title, .poster-title').text().trim();

      if (link && title && link !== '#' && !title.includes('Kawanfilm')) {
        const id = link.split('/').filter(Boolean).pop() || '';
        const img = $(el).find('img');
        const poster = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || img.attr('data-original') || '';
        const ratingRaw = $(el).find('.rating, .imdb').text().trim();
        const yearRaw = $(el).find('.year').text().trim();
        const duration = $(el).find('.duration').text().trim() || null;
        const genre = $(el).find('meta[itemprop="genre"]').attr('content') || $(el).find('.genre').text().trim() || null;

        // Series cards show "EPS <n>"; the badge has class "complete" once the series has finished airing.
        const badge = $(el).find('.episode').first();
        const episodes = badge.length ? parseInt(badge.find('strong').text() || badge.text().replace(/\D+/g, ''), 10) || null : null;
        const status = badge.length ? (badge.hasClass('complete') ? 'complete' : 'ongoing') : null;

        if (id) {
          const card: CatalogCard = {
            ...(status ? { status, episodes } : {}),
            ...emptyExtraDetails(),
            id,
            slug: id,
            title,
            year: parseInt(yearRaw, 10) || null,
            poster,
            rating: parseFloat(ratingRaw) || null,
            duration,
            genre,
            type: link.includes('series') || /^S\./i.test(duration || '') || $(el).find('.episode').length > 0 ? 'series' : 'movie'
          };
          if (isCatalogCard(card)) items.push(card);
        }
      }
    });

    // Pagination: LK21 lists a few page numbers plus a "»" link to the last page (listings stop at 50),
    // so the highest /page/N among all pagination links is the page count.
    const pageNumbers = $('.pagination a[href*="/page/"]').toArray()
      .map(link => Number(($(link).attr('href') || '').match(/\/page\/(\d+)/)?.[1]))
      .filter(value => Number.isInteger(value) && value > 0 && value <= 1000);
    const totalPages = Math.max(page, 1, ...pageNumbers);

    return {
      page,
      totalPages,
      items
    };
  }
}
