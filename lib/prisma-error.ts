// P2002: 一意制約の違反 / P2003: 外部キー制約の違反 / P2025: where に合う行が無い（持ち主でない・ゴミ箱に移された）
export function prismaErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? error.code
    : undefined;
}
