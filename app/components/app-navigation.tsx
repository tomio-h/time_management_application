"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "ダッシュボード",
    isActive: (pathname) => pathname === "/dashboard",
  },
  {
    href: "/records",
    label: "記録一覧",
    isActive: (pathname) => pathname === "/records",
  },
  {
    href: "/records/new",
    label: "手動追加",
    isActive: (pathname) => pathname === "/records/new",
  },
  {
    href: "/calendar",
    label: "カレンダー",
    isActive: (pathname) => pathname === "/calendar",
  },
  {
    href: "/analytics",
    label: "分析",
    isActive: (pathname) => pathname === "/analytics",
  },
  {
    href: "/tags",
    label: "タグ管理",
    isActive: (pathname) => pathname === "/tags",
  },
];

function getLinkClassName(isActive: boolean) {
  return `flex h-9 items-center justify-center rounded-md px-3 text-sm font-semibold transition-colors ${
    isActive
      ? "bg-zinc-950 text-white"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
  }`;
}

function getMobileLinkClassName(isActive: boolean) {
  return `flex h-10 items-center justify-center rounded-md px-2 text-xs font-semibold transition-colors ${
    isActive
      ? "bg-zinc-950 text-white"
      : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
  }`;
}

export function AppNavigation() {
  const pathname = usePathname() ?? "";

  return (
    <>
      <nav
        aria-label="主要画面"
        className="sticky top-0 z-40 hidden border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur sm:block"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <Link href="/dashboard" className="flex flex-col">
            <span className="text-base font-semibold text-zinc-950">
              Time Wallet
            </span>
            <span className="text-xs font-medium text-zinc-500">時間家計簿</span>
          </Link>
          <div className="flex flex-wrap justify-end gap-2">
            {navigationItems.map((item) => {
              const isActive = item.isActive(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={getLinkClassName(isActive)}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <nav
        aria-label="主要画面"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(24,24,27,0.08)] backdrop-blur sm:hidden"
      >
        <div className="grid grid-cols-3 gap-1">
          {navigationItems.map((item) => {
            const isActive = item.isActive(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={getMobileLinkClassName(isActive)}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
