"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
} from "../lib/supabase/client";

type AuthMode = "signIn" | "signUp";

export default function LoginPage() {
  const router = useRouter();
  const isConfigured = hasSupabaseBrowserConfig();
  const [authMode, setAuthMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignIn = authMode === "signIn";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setErrorMessage("Supabaseの環境変数が未設定です。");
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage("メールアドレスとパスワードを入力してください。");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignIn) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        router.push("/dashboard");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setSuccessMessage(
        "確認メールを送信しました。メール確認後にログインしてください。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="w-full bg-zinc-100 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="mx-auto grid min-h-[calc(100svh-8rem)] w-full max-w-6xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(420px,480px)]">
        <div className="hidden bg-zinc-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-base font-semibold text-zinc-300">Time Wallet</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight">
              時間家計簿
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-300">
              今日の時間を、見える形に。
            </p>
          </div>
          <p className="text-sm font-semibold text-zinc-400">
            Time Wallet
          </p>
        </div>

        <div className="flex w-full items-center justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="w-full max-w-[480px]">
            <div className="mb-7">
              <p className="text-base font-semibold text-zinc-500">
                Time Wallet
              </p>
              <h1 className="mt-2 text-3xl font-bold text-zinc-950">
                {isSignIn ? "ログイン" : "新規登録"}
              </h1>
            </div>

            {!isConfigured && (
              <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-base font-medium leading-7 text-amber-800">
                `.env.local` に Supabase のURLとanon keyを設定するとログインできます。
              </div>
            )}

            <div className="mb-6 grid grid-cols-2 rounded-lg bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signIn");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className={`min-h-12 rounded-md px-3 text-base font-semibold transition-colors ${
                  isSignIn
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-950"
                }`}
              >
                ログイン
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signUp");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className={`min-h-12 rounded-md px-3 text-base font-semibold transition-colors ${
                  !isSignIn
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-950"
                }`}
              >
                新規登録
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-base font-semibold text-zinc-700"
                >
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="min-h-[3.25rem] w-full rounded-md border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition-colors focus:border-zinc-950"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-base font-semibold text-zinc-700"
                >
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isSignIn ? "current-password" : "new-password"}
                  className="min-h-[3.25rem] w-full rounded-md border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition-colors focus:border-zinc-950"
                />
              </div>

              {errorMessage && (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-base font-medium leading-7 text-red-700">
                  {errorMessage}
                </p>
              )}

              {successMessage && (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-medium leading-7 text-emerald-700">
                  {successMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={!isConfigured || isSubmitting}
                className="min-h-[3.25rem] w-full rounded-md bg-zinc-950 px-4 text-base font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {isSubmitting
                  ? "処理中..."
                  : isSignIn
                    ? "ログインする"
                    : "登録する"}
              </button>
            </form>

            <div className="mt-6 flex justify-center">
              <Link
                href="/dashboard"
                className="min-h-12 rounded-md px-4 py-3 text-base font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              >
                ログインせずに使う
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
