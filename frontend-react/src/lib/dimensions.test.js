import { parseDimensionToMM } from './dimensions';

describe('parseDimensionToMM', () => {
  it('handles German decimals and cm heuristic', () => {
    expect(parseDimensionToMM('10,5')).toBe(105);
    expect(parseDimensionToMM('21')).toBe(210);
    expect(parseDimensionToMM('105 mm')).toBe(105);
    expect(parseDimensionToMM('19 cm')).toBe(190);
  });
});
