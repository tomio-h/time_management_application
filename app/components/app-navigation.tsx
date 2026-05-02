"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
} from "../lib/supabase/client";

type NavigationItem = {
  href: string;
  label: string;
  mobileLabel: string;
  isActive: (pathname: string) => boolean;
};

type AuthControlsProps = {
  pathname: string;
  variant: "desktop" | "mobile";
};

const navigationItems: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "ダッシュボード",
    mobileLabel: "今日",
    isActive: (pathname) => pathname === "/dashboard",
  },
  {
    href: "/records",
    label: "記録一覧",
    mobileLabel: "記録",
    isActive: (pathname) => pathname === "/records",
  },
  {
    href: "/records/new",
    label: "手動追加",
    mobileLabel: "追加",
    isActive: (pathname) => pathname === "/records/new",
  },
  {
    href: "/calendar",
    label: "カレンダー",
    mobileLabel: "暦",
    isActive: (pathname) => pathname === "/calendar",
  },
  {
    href: "/analytics",
    label: "分析",
    mobileLabel: "分析",
    isActive: (pathname) => pathname === "/analytics",
  },
  {
    href: "/tags",
    label: "タグ管理",
    mobileLabel: "タグ",
    isActive: (pathname) => pathname === "/tags",
  },
];

function getLinkClassName(isActive: boolean) {
  return `flex min-h-10 items-center justify-center rounded-md px-3.5 text-[0.95rem] font-semibold transition-colors ${
    isActive
      ? "bg-zinc-950 text-white"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
  }`;
}

function getMobileLinkClassName(isActive: boolean) {
  return `flex min-h-10 items-center justify-center rounded-md px-1 text-center text-[0.72rem] font-semibold leading-tight transition-colors ${
    isActive
      ? "bg-zinc-950 text-white"
      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
  }`;
}

function AuthControls({ pathname, variant }: AuthControlsProps) {
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => hasSupabaseBrowserConfig());
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isMobile = variant === "mobile";
  const isLoginActive = pathname === "/login";

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    let isMounted = true;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) {
          return;
        }

        setEmail(data.session?.user.email ?? null);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setEmail(null);
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setEmail(null);
      return;
    }

    setIsSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (!error) {
        setEmail(null);
      }
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isLoading) {
    return (
      <span
        className={
          isMobile
            ? "mb-1 flex min-h-8 items-center justify-center rounded-md bg-zinc-50 px-2 text-xs font-semibold text-zinc-500"
            : "flex min-h-12 items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 text-[0.95rem] font-semibold text-zinc-500"
        }
      >
        保存先を確認中
      </span>
    );
  }

  if (!email) {
    return (
      <div
        className={
          isMobile
            ? "mb-1 flex min-h-9 items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1"
            : "flex min-w-[19rem] max-w-full items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
        }
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-amber-950 sm:text-sm">
            この端末に保存中
          </span>
          <span className="hidden truncate text-xs font-medium text-amber-700 min-[390px]:block">
            ログインするとクラウド保存できます
          </span>
        </span>
        <Link
          href="/login"
          aria-current={isLoginActive ? "page" : undefined}
          className={`flex min-h-8 shrink-0 items-center justify-center rounded-md px-2.5 text-xs font-semibold transition-colors sm:min-h-10 sm:px-3 sm:text-sm ${
            isLoginActive
              ? "bg-zinc-950 text-white"
              : "bg-white text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
          }`}
        >
          ログイン
        </Link>
      </div>
    );
  }

  return (
    <div
      className={
        isMobile
          ? "mb-1 flex min-h-9 items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1"
          : "flex min-w-[20rem] max-w-full items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
      }
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-emerald-950 sm:text-sm">
          クラウドに保存中
        </span>
        <span className="hidden truncate text-xs font-medium text-emerald-700 min-[390px]:block">
          {email}
        </span>
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className={
          isMobile
            ? "min-h-8 shrink-0 rounded-md bg-zinc-950 px-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
            : "min-h-10 shrink-0 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
        }
      >
        ログアウト
      </button>
    </div>
  );
}

export function AppNavigation() {
  const pathname = usePathname() ?? "";

  return (
    <>
      <nav
        aria-label="主要画面"
        className="sticky top-0 z-40 hidden border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur sm:block"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <Link href="/dashboard" className="flex shrink-0 flex-col">
            <span className="text-lg font-semibold text-zinc-950">
              Time Wallet
            </span>
            <span className="text-sm font-medium text-zinc-500">時間家計簿</span>
          </Link>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
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
            <AuthControls pathname={pathname} variant="desktop" />
          </div>
        </div>
      </nav>

      <nav
        aria-label="主要画面"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-6px_18px_rgba(24,24,27,0.08)] backdrop-blur sm:hidden"
      >
        <AuthControls pathname={pathname} variant="mobile" />
        <div className="grid grid-cols-6 gap-1">
          {navigationItems.map((item) => {
            const isActive = item.isActive(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={getMobileLinkClassName(isActive)}
              >
                {item.mobileLabel}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
