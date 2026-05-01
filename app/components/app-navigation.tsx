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
  return `flex min-h-10 items-center justify-center rounded-md px-3.5 text-[0.95rem] font-semibold transition-colors ${
    isActive
      ? "bg-zinc-950 text-white"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
  }`;
}

function getMobileLinkClassName(isActive: boolean) {
  return `flex min-h-12 items-center justify-center rounded-lg px-2 text-center text-[0.78rem] font-semibold leading-tight transition-colors ${
    isActive
      ? "bg-zinc-950 text-white"
      : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
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
            ? "mb-2 flex min-h-12 items-center justify-center rounded-lg bg-zinc-50 px-3 text-sm font-semibold text-zinc-500"
            : "flex min-h-10 items-center rounded-md px-3.5 text-[0.95rem] font-semibold text-zinc-500"
        }
      >
        確認中
      </span>
    );
  }

  if (!email) {
    return (
      <Link
        href="/login"
        aria-current={isLoginActive ? "page" : undefined}
        className={
          isMobile
            ? `mb-2 flex min-h-12 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors ${
                isLoginActive
                  ? "bg-zinc-950 text-white"
                  : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              }`
            : getLinkClassName(isLoginActive)
        }
      >
        ログイン
      </Link>
    );
  }

  return (
    <div
      className={
        isMobile
          ? "mb-2 flex min-h-12 items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2"
          : "flex min-w-[15rem] items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5"
      }
    >
      <span
        className={
          isMobile
            ? "min-w-0 flex-1 truncate text-sm font-semibold text-zinc-600"
            : "min-w-0 flex-1 truncate text-sm font-semibold text-zinc-600"
        }
      >
        {email}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className={
          isMobile
            ? "min-h-10 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
            : "min-h-9 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
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
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-3 pb-3 pt-2 shadow-[0_-8px_24px_rgba(24,24,27,0.08)] backdrop-blur sm:hidden"
      >
        <AuthControls pathname={pathname} variant="mobile" />
        <div className="grid grid-cols-3 gap-2">
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
