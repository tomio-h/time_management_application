"use client";

import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

const gettingStartedSteps = [
  "タグを作る",
  "タイマーまたは手動追加で記録する",
  "カレンダーや分析で振り返る",
  "ログインするとクラウド保存できます",
];

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-4 text-center sm:px-4 sm:py-5">
      <p className="text-sm font-semibold text-zinc-950">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-zinc-500 sm:text-sm sm:leading-6">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function GettingStartedCard() {
  return (
    <section className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          はじめての使い方
        </p>
        <h2 className="text-lg font-semibold text-zinc-950 sm:text-xl">
          まずは小さく記録を始めましょう
        </h2>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {gettingStartedSteps.map((step, index) => (
          <div
            key={step}
            className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700 ring-1 ring-zinc-100"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white">
              {index + 1}
            </span>
            <span className="font-medium leading-5">{step}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
