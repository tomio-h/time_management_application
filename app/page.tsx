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

const sampleTags = [
  { name: "研究", minutes: "2h40m", color: "#7c3aed" },
  { name: "授業", minutes: "1h30m", color: "#2563eb" },
  { name: "課題", minutes: "1h15m", color: "#0f766e" },
];

export default function Home() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-zinc-100 text-zinc-950">
      <section className="w-full overflow-hidden bg-zinc-950 text-white">
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:min-h-[640px] lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] lg:gap-10 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-base font-semibold text-zinc-300">時間家計簿</p>
            <div className="mt-5 max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-normal sm:text-6xl lg:text-7xl">
                Time Wallet
              </h1>
              <p className="mt-5 text-base leading-7 text-zinc-200 sm:mt-6 sm:text-xl sm:leading-9">
                活動時間をタグで記録し、円グラフやカレンダーで自分の時間の使い方を振り返るアプリです。
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex h-14 w-full items-center justify-center rounded-md bg-white px-7 text-base font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-zinc-200 sm:w-auto"
              >
                ダッシュボードへ
              </Link>
              <Link
                href="/records/new"
                className="inline-flex h-14 w-full items-center justify-center rounded-md border border-white/20 px-7 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                記録を追加
              </Link>
              <Link
                href="/analytics"
                className="inline-flex h-14 w-full items-center justify-center rounded-md border border-white/20 px-7 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                分析を見る
              </Link>
            </div>
          </div>

          <div className="w-full space-y-4 sm:space-y-5">
            <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-2xl sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-base font-medium text-zinc-300">今日の記録</p>
                  <p className="mt-2 text-4xl font-semibold">8h20m</p>
                </div>
                <span className="rounded-md bg-emerald-400/20 px-4 py-2 text-base font-semibold text-emerald-100">
                  35%
                </span>
              </div>
              <div className="mt-6 h-4 overflow-hidden rounded-full bg-white/15">
                <div className="h-full w-[35%] rounded-full bg-emerald-400" />
              </div>
              <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-4">
                {sampleTags.map((tag) => (
                  <div
                    key={tag.name}
                    className="rounded-md border border-white/10 bg-white/10 p-4"
                  >
                    <span
                      className="block h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <p className="mt-4 text-base font-semibold">{tag.name}</p>
                    <p className="mt-1 text-sm text-zinc-300">{tag.minutes}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-2xl sm:p-6">
              <div className="flex h-36 items-end justify-between gap-2 sm:h-44 sm:gap-3">
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

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div>
          <p className="text-base font-medium text-zinc-500">主な機能</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-zinc-950 sm:text-4xl">
            記録から振り返りまでをひとつに
          </h2>
        </div>

        <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-6"
            >
              <h3 className="text-xl font-semibold text-zinc-950">
                {feature.title}
              </h3>
              <p className="mt-3 text-base leading-7 text-zinc-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
