export const simpleTemplates = {
  renewal_reminder: (n, d, g, p) => `Hi ${n}! 👋\nYour membership at ${g} expires in ${d} days.\nContact: ${p}\nDon't break your streak! 🔥`,
  expired_alert: (n, d, g, p) => `⚠️ ${n}, Your ${g} membership expired ${d} days ago.\nRenew: ${p}\nWe miss you! 💪`,
  welcome: (n, g, d) => `🏋️ Welcome ${n}!\nYour membership is active for ${d} days.\nLet's transform! 💪`
};