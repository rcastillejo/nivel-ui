export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}
