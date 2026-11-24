import { BaseScraper } from './BaseScraper';
import * as cheerio from 'cheerio';
import { CatalogCard, HomeSnapshot, HomeSection, emptyExtraDetails, isCatalogCard } from '../types/catalog';

export class HomeScraper extends BaseScraper {
  async scrapeHome() {
    const $ = await this.fetchHtml('/');
    
    const sections: HomeSnapshot = {
      filmUnggulan: [],
      latestMovies: [],
      latestSeries: [],
      seriesUpdate: [],
      topMonth: [],
      recommendations: [],
      family: [],
      action: [],
      drakor: [],
      horror: [],
      romance: [],
      comedy: [],
      korea: [],
      thailand: [],
      india: []
    };

    $('.slider-wrapper').each((_, el) => {
      const label = ($(el).attr('aria-label') || '').toLowerCase().trim();
      const sliders = $(el).find('.sliders');
      if (sliders.length === 0) return;

      const cards = this.extractCards($, sliders).slice(0, 10);

      if (label.includes('film unggulan')) sections.filmUnggulan = cards;
      else if (label.includes('film terbaru')) sections.latestMovies = cards;
      else if (label.includes('series unggulan')) sections.latestSeries = cards;
      else if (label.includes('series update')) sections.seriesUpdate = cards;
      else if (label.includes('top bulan ini')) sections.topMonth = cards;
      else if (label.includes('rekomendasi')) sections.recommendations = cards;
      else if (label.includes('keluarga')) sections.family = cards;
      else if (label.includes('action')) sections.action = cards;
      else if (label.includes('drakor')) sections.drakor = cards;
      else if (label.includes('horror')) sections.horror = cards;
      else if (label.includes('romance')) sections.romance = cards;
      else if (label.includes('comedy')) sections.comedy = cards;
      else if (label.includes('korea')) sections.korea = cards;
      else if (label.includes('thailand')) sections.thailand = cards;
      else if (label.includes('india')) sections.india = cards;
    });

    for (const key of ['latestSeries', 'seriesUpdate', 'drakor'] as HomeSection[]) {
      for (const card of sections[key]) card.type = 'series';
    }
    return sections;
  }

  private extractCards($: cheerio.CheerioAPI, container: cheerio.Cheerio<cheerio.AnyNode>) {
    const items: CatalogCard[] = [];
    container.find('li').each((_, el) => {
      const link = $(el).find('a').attr('href');
      const title = $(el).find('.poster-title').text().trim() || $(el).find('h2, .title').text().trim();
      const img = $(el).find('img');
      const poster = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || img.attr('data-original') || '';
      const ratingRaw = $(el).find('.rating, .imdb').text().trim();
      
      if (link && title && !link.includes('/genre') && !link.includes('/country') && !link.includes('/year')) {
        const id = link.split('/').filter(Boolean).pop() || '';
        const yearRaw = $(el).find('.year').text().trim();
        const duration = $(el).find('.duration').text().trim() || null;
        const genre = $(el).find('meta[itemprop="genre"]').attr('content') || $(el).find('.genre').text().trim() || null;
        const card: CatalogCard = {
          ...emptyExtraDetails(),
          id, 
          slug: id,
          type: link.includes('series') || /^S\./i.test(duration || '') || $(el).find('.episode').length > 0 ? 'series' : 'movie',
          title, 
          year: parseInt(yearRaw, 10) || null, 
          poster, 
          rating: parseFloat(ratingRaw) || null,
          duration,
          genre
        };
        if (isCatalogCard(card)) items.push(card);
      }
    });
    return items;
  }
}
