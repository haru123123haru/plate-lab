// プレートの詳細へ移るとき、データがそろうまで出すスケルトン。
// (app)/loading.tsx は一覧の形なので、詳細の形（見出しとウェルマップ）に合わせる
export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse bg-bg-primary" aria-busy="true">
      <div className="flex items-center gap-3 px-6 pt-14 pb-4">
        <div className="size-6 rounded bg-border-default" />
        <div className="h-6 w-40 rounded bg-border-default" />
      </div>
      <div className="space-y-6 px-6">
        <div>
          <div className="h-3 w-20 rounded bg-border-default" />
          <div className="mt-3 aspect-[3/2] rounded-xl bg-border-default" />
        </div>
        <div>
          <div className="h-3 w-16 rounded bg-border-default" />
          <div className="mt-3 h-12 rounded-xl bg-border-default" />
        </div>
      </div>
    </div>
  );
}
