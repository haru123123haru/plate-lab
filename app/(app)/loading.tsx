// (app) の直下の画面へ移るとき、データがそろうまで出すスケルトン。
// ヘッダーやタブバーは各ページが描いているので、読み込み中は画面全体をこれに置き換える
export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse bg-bg-primary" aria-busy="true">
      <div className="px-6 pt-14 pb-4">
        <div className="h-8 w-40 rounded bg-border-default" />
        <div className="mt-2 h-[3px] w-7 bg-border-default" />
      </div>
      <div className="space-y-5 px-6">
        <div className="h-11 rounded-lg bg-border-default" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-10 shrink-0 rounded-full bg-border-default" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 rounded bg-border-default" />
              <div className="h-3 w-1/3 rounded bg-border-default" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
