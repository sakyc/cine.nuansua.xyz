import { filterIndonesianFilms, indonesianFilms } from '../frontend/src/data/indonesianFilms';

describe('Indonesian film collection', () => {
  it('keeps distinct full-length videos with source attribution and verification dates', () => {
    expect(new Set(indonesianFilms.map(film => film.id)).size).toBe(indonesianFilms.length);
    expect(new Set(indonesianFilms.map(film => film.source)).size).toBeGreaterThan(1);
    for (const film of indonesianFilms) {
      expect(film.id).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(film.channelId).toMatch(/^UC[A-Za-z0-9_-]{22}$/);
      expect(film.durationSeconds).toBeGreaterThan(3600);
      expect(Number.isFinite(Date.parse(film.verifiedAt))).toBe(true);
    }
  });

  it('finds a title regardless of casing and surrounding spaces', () => {
    expect(filterIndonesianFilms('  NOKTAH MERAH  ', '').map(film => film.title)).toEqual(['Noktah Merah Perkawinan']);
  });

  it('combines title and source filters without mixing providers', () => {
    expect(filterIndonesianFilms('Melodylan', 'Rapi Films')).toEqual([]);
    expect(filterIndonesianFilms('Melodylan', 'MD Entertainment')).toHaveLength(1);
    expect(filterIndonesianFilms('', 'MD Entertainment').every(film => film.source === 'MD Entertainment')).toBe(true);
  });

  it('returns an empty result for an unknown title or source and all films for empty filters', () => {
    expect(filterIndonesianFilms('nonexistent-movie-xyz', '')).toEqual([]);
    expect(filterIndonesianFilms('', 'Unknown provider')).toEqual([]);
    expect(filterIndonesianFilms(' ', '')).toEqual(indonesianFilms);
  });
});
