export function predictNextDate(addedDates) {
  if (!addedDates || addedDates.length < 2) return null;

  const sorted = addedDates
    .map((d) => d.toMillis())
    .sort((a, b) => a - b);

  let totalInterval = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalInterval += sorted[i] - sorted[i - 1];
  }

  const avgInterval = totalInterval / (sorted.length - 1);
  const lastDate = sorted[sorted.length - 1];

  return new Date(lastDate + avgInterval);
}
