export function getDaysRemaining(expiryDate) {
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((expiry - now) / (1000 * 60 * 60 * 24));
}

export function getSubscriptionStatus(expiryDate) {
  const days = getDaysRemaining(expiryDate);
  if (days <= 0) return 'expired';
  if (days <= 5) return 'expiring';
  return 'active';
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}