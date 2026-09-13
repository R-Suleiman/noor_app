import { Component } from "react";

export default class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Noor interface failure", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-dvh items-center justify-center bg-zinc-950 p-6 text-center text-zinc-100">
        <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900 p-7 shadow-2xl">
          <img src="/pwa-icon-192.png" alt="Noor" className="mx-auto h-16 w-16 rounded-2xl" />
          <h1 className="mt-5 text-xl font-bold">Noor needs to restart</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Something unexpected interrupted this screen. Your account and saved listening are safe.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-xl border-0 bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500"
          >
            Reload Noor
          </button>
        </section>
      </main>
    );
  }
}
