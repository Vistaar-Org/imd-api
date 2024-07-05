import { v4 as uuidv4 } from 'uuid';
import { performance, PerformanceObserver } from 'perf_hooks';

// Function to generate a specified number of UUIDs
function generateUUIDs(count: number): string[] {
  return Array.from({ length: count }, () => uuidv4());
}

// Measure the execution time
function measureExecutionTime(taskName: string, task: () => any) {
  const startMark = `${taskName}-start`;
  const endMark = `${taskName}-end`;

  performance.mark(startMark);

  task();

  performance.mark(endMark);
  performance.measure(taskName, startMark, endMark);
}

// Performance Observer to log the measurements
const obs = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
  performance.clearMarks();
});

obs.observe({ entryTypes: ['measure'] });

// Example usage
measureExecutionTime('Generate 5 UUIDs', () => {
  const uuids = generateUUIDs(5);
  console.log(uuids);
});
