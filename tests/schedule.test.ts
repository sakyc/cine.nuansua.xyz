import { summarizeSchedule } from '../src/services/ScheduleService';

jest.mock('../src/services/catalog', () => ({ catalog: {} }));

const upload = (number: number, published: string) => ({ title: `Episode ${number}`, number, published });
const now = Date.parse('2026-11-25T00:00:00Z');

describe('series update schedule', () => {
  it('reports the weekdays recent episodes were uploaded, Monday first', () => {
    const schedule = summarizeSchedule([
      upload(12, '2026-11-24T14:21:02'), // Tuesday
      upload(11, '2026-11-23T14:00:00'), // Monday
      upload(10, '2026-11-17T14:00:00'), // Tuesday
      upload(9, '2026-11-16T14:00:00'), // Monday
    ], now);
    expect(schedule).toEqual({
      days: ['Senin', 'Selasa'], active: true, basedOn: 4,
      lastEpisode: { title: 'Episode 12', number: 12, published: '2026-11-24T14:21:02' },
    });
  });

  it('ignores a one-off upload day among many', () => {
    const uploads = [
      upload(8, '2026-11-18T09:00:00'), upload(7, '2026-11-11T09:00:00'), upload(6, '2026-11-04T09:00:00'),
      upload(5, '2026-10-28T09:00:00'), upload(4, '2026-10-21T09:00:00'), upload(3, '2026-10-17T09:00:00'),
    ];
    expect(summarizeSchedule(uploads, now).days).toEqual(['Rabu']);
  });

  it('marks a series without uploads in the last two weeks as inactive', () => {
    expect(summarizeSchedule([upload(8, '2026-08-02T06:48:45')], now)).toMatchObject({ active: false, days: ['Minggu'] });
  });

  it('handles series without usable dates', () => {
    expect(summarizeSchedule([upload(1, 'not a date')], now)).toEqual({ days: [], lastEpisode: null, active: false, basedOn: 0 });
  });
});
