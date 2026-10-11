// 一時的な計測（#17）。測り終えたら、このファイルごと消す
export async function timed<T>(label: string, work: Promise<T>): Promise<T> {
  const started = performance.now();
  const result = await work;
  console.log(`[timing] ${label} ${Math.round(performance.now() - started)}ms`);
  return result;
}
