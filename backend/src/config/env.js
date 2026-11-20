// Called once at startup. Only enforces rules in production.
export function assertProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;

  const problems = [];

  if (!process.env.CORS_ORIGINS) {
    problems.push('CORS_ORIGINS must list your frontend URL(s).');
  }
  if (process.env.BCRYPT_COST && Number(process.env.BCRYPT_COST) < 12) {
    problems.push('BCRYPT_COST must not be lowered in production.');
  }
  if (problems.length > 0) throw new Error(problems.join(' '));

  if (!process.env.TRUST_PROXY) {
    console.warn('TRUST_PROXY is not set. Behind a host proxy, rate limits will see every visitor as one IP.');
  }
}