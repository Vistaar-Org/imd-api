import { deduceWeatherCondition, getParsedDate } from './app.utils';

it('check deduce weather', () => {
  expect(deduceWeatherCondition('--')).toBe('Sunny');
});

it('get parsed date', () => {
  const parsedDate = getParsedDate('10/07/2024');
  console.log('parsedDate: ', parsedDate);
  expect(parsedDate).toBe('2024-07-10');
});
