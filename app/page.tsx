import Link from "next/link";

const features = [
  {
    title: "タイマー記録",
    description: "選んだ活動タグで開始し、止めるだけで今日の時間に反映します。",
  },
  {
    title: "手動記録追加",
    description: "記録し忘れた活動も、日付・開始時刻・終了時刻から追加できます。",
  },
  {
    title: "タグ管理",
    description: "授業、研究、睡眠など、自分の生活に合う活動タグを管理できます。",
  },
  {
    title: "カレンダー表示",
    description: "月間カレンダーで、日ごとの記録状況と活動の傾向を確認できます。",
  },
  {
    title: "分析画面",
    description: "円グラフや日別一覧で、時間の使い方を期間ごとに振り返れます。",
  },
];

const previewItems = [
  { title: "タグ", description: "活動を分類", color: "#2563eb" },
  { title: "記録", description: "時間を保存", color: "#16a34a" },
  { title: "分析", description: "配分を見る", color: "#7c3aed" },
];

export default function Home() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-zinc-50 text-zinc-950">
      <section className="w-full overflow-hidden bg-zinc-950 text-white">
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-6 px-4 py-9 sm:px-6 sm:py-16 lg:min-h-[640px] lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] lg:gap-10 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-zinc-300 sm:text-base">
              時間家計簿
            </p>
            <div className="mt-4 max-w-3xl sm:mt-5">
              <h1 className="text-4xl font-semibold tracking-normal sm:text-6xl lg:text-7xl">
                Time Wallet
              </h1>
              <p className="mt-4 text-base leading-7 text-zinc-200 sm:mt-6 sm:text-xl sm:leading-9">
                活動時間をタグで記録し、円グラフやカレンダーで自分の時間の使い方を振り返るアプリです。
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:gap-4">
              <Link
                href="/dashboard"
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-zinc-200 sm:h-14 sm:w-auto sm:px-7 sm:text-base"
              >
                ダッシュボードへ
              </Link>
              <Link
                href="/records/new"
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-white/20 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:h-14 sm:w-auto sm:px-7 sm:text-base"
              >
                記録を追加
              </Link>
              <Link
                href="/analytics"
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-white/20 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:h-14 sm:w-auto sm:px-7 sm:text-base"
              >
                分析を見る
              </Link>
            </div>
          </div>

          <div className="w-full space-y-4 sm:space-y-5">
            <div className="rounded-lg border border-white/15 bg-white/10 p-3 shadow-2xl sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-300 sm:text-base">
                    今日の記録
                  </p>
                  <p className="mt-1 text-2xl font-semibold sm:mt-2 sm:text-4xl">
                    記録すると表示
                  </p>
                </div>
                <span className="rounded-md bg-emerald-400/20 px-3 py-1.5 text-sm font-semibold text-emerald-100 sm:px-4 sm:py-2 sm:text-base">
                  cloud
                </span>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15 sm:mt-6 sm:h-4">
                <div className="h-full w-[42%] rounded-full bg-emerald-400" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-4">
                {previewItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-md border border-white/10 bg-white/10 p-2.5 sm:p-4"
                  >
                    <span
                      className="block h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3"
                      style={{ backgroundColor: item.color }}
                    />
                    <p className="mt-3 text-sm font-semibold sm:mt-4 sm:text-base">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-300 sm:text-sm">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/10 p-3 shadow-2xl sm:p-6">
              <div className="flex h-28 items-end justify-between gap-2 sm:h-44 sm:gap-3">
                {[40, 80, 55, 120, 90, 150, 70].map((height, index) => (
                  <div
                    key={index}
                    className="flex flex-1 items-end rounded-t-md bg-blue-400/25"
                    style={{ height }}
                  >
                    <div
                      className="w-full rounded-t-md bg-blue-300"
                      style={{ height: `${Math.max(height - 24, 16)}px` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div>
          <p className="text-sm font-semibold text-zinc-500 sm:text-base">
            主な機能
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight text-zinc-950 sm:mt-2 sm:text-4xl">
            記録から振り返りまでをひとつに
          </h2>
        </div>

        <div className="mt-4 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-6"
            >
              <h3 className="text-lg font-semibold text-zinc-950 sm:text-xl">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 sm:mt-3 sm:text-base sm:leading-7">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
