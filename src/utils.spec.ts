import { deduceWeatherCondition } from './app.utils';

it('check deduce weather', () => {
  expect(deduceWeatherCondition('--')).toBe('Sunny');
});
