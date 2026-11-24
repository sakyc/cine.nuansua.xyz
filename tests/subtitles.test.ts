import { positionSubtitleVtt, subtitleToVtt } from '../frontend/src/services/subtitles';

describe('subtitle validation', () => {
  it('preserves valid WebVTT while normalizing line endings', () => {
    expect(subtitleToVtt('\uFEFFWEBVTT\r\n\r\n00:00:01.000 --> 00:00:02.000\r\nHalo'))
      .toBe('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHalo');
  });
  it.each(['invalid', 'no timestamps', 'hello'])('rejects invalid subtitle content', content => {
    expect(() => subtitleToVtt(content)).toThrow();
  });
});

it.each([['top', 10], ['middle', 50], ['bottom', 90]] as const)('positions subtitle cues at %s', (position, line) => {
  const text = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000 line:20% align:start\nHalo';
  expect(positionSubtitleVtt(text, position)).toContain(`00:00:01.000 --> 00:00:02.000 line:${line}%,center align:start`);
});
