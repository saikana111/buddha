// Local wall-clock schedule; deliberately does not claim astronomical sun times.
export function scenePhase(date = new Date()) {
  const hour = date.getHours() + date.getMinutes()/60;
  if (hour >= 5 && hour < 7) return 'sunrise';
  if (hour >= 7 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'midday';
  if (hour >= 17 && hour < 20) return 'sunset';
  return 'night';
}
