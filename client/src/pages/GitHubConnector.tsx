import { useState } from "react";
import { ArrowLeft, ExternalLink, GitBranch, Github, LockKeyhole, RefreshCw, ShieldCheck, Star } from "lucide-react";
import { Link } from "wouter";
import { githubCapabilities, githubSnapshot, formatGitHubDate } from "@/data/githubSnapshot";

type SnapshotState = "loading" | "error" | "empty" | "loaded";

export default function GitHubConnector() {
  const { account, repositories } = githubSnapshot;
  const [snapshotState, setSnapshotState] = useState<SnapshotState>("loaded");

  return (
    <main className="min-h-screen bg-[#f4f8f6] text-[#132b34]">
      <header className="border-b border-[#dce7e4] bg-white">
        <div className="container flex min-h-20 items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42636b] transition-colors hover:text-[#132b34]">
            <ArrowLeft size={17} /> Back to NEAS
          </Link>
          <div className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#6b9631] sm:flex">
            <Github size={17} /> Connector lab
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#102f39] text-white">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(182,239,60,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(182,239,60,.12) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="container relative grid gap-10 py-16 md:grid-cols-[1.15fr_.85fr] md:items-end md:py-24">
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[.24em] text-[#b6ef3c]">GitHub connector test</p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-.04em] sm:text-6xl">A clear view into connected code.</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#c7d5d5] sm:text-lg">This page documents what the authenticated GitHub integration can do and shows a small repository snapshot captured during the connector test.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[.07] p-6 backdrop-blur">
            <div className="flex items-center gap-3 text-[#b6ef3c]"><ShieldCheck size={20} /><span className="text-xs font-bold uppercase tracking-[.18em]">Connection status</span></div>
            <p className="mt-4 text-2xl font-semibold">Authenticated access confirmed</p>
            <p className="mt-2 text-sm leading-6 text-[#c7d5d5]">The snapshot below was fetched through the enabled GitHub integration, not invented demo content.</p>
          </div>
        </div>
      </section>

      <div className="container py-12 sm:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#dce7e4] md:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#6b9631]">Account snapshot</p><h2 className="mt-2 text-2xl font-semibold">{account.name}</h2></div>
              <Github className="text-[#6b9631]" size={28} />
            </div>
            <p className="mt-2 font-mono text-sm text-[#667b80]">@{account.login}</p>
            <div className="mt-7 grid grid-cols-3 gap-3">
              {[['Public repositories', account.publicRepos], ['Followers', account.followers], ['Following', account.following]].map(([label, value]) => <div key={label} className="rounded-xl bg-[#f4f8f6] p-4"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs leading-4 text-[#667b80]">{label}</p></div>)}
            </div>
          </section>
          <section className="rounded-2xl bg-[#b6ef3c] p-6 text-[#132b34] shadow-sm">
            <RefreshCw size={24} />
            <h2 className="mt-8 text-xl font-semibold">How to use it</h2>
            <p className="mt-3 text-sm leading-6">Ask for a repository lookup, issue review, pull-request summary, or a specific metadata check. The connector is best for authenticated GitHub tasks that need current account context.</p>
          </section>
        </div>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#6b9631]">Fetched data</p><h2 className="mt-2 text-3xl font-semibold">Repository snapshot</h2></div><p className="max-w-md text-sm leading-6 text-[#667b80]">Captured from the connected GitHub account. Timestamps are shown in UTC.</p></div>
          <div className="mt-5 flex flex-wrap items-center gap-2" aria-label="Snapshot state preview"><span className="mr-2 text-xs font-bold uppercase tracking-[.14em] text-[#809196]">State preview</span>{(["loaded", "loading", "error", "empty"] as SnapshotState[]).map((state) => <button key={state} type="button" onClick={() => setSnapshotState(state)} aria-pressed={snapshotState === state} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${snapshotState === state ? "bg-[#102f39] text-white" : "bg-white text-[#577078] ring-1 ring-[#dce7e4] hover:bg-[#f0f4f2]"}`}>{state}</button>)}</div>
          {snapshotState === "loading" && <div className="mt-6 grid gap-4 lg:grid-cols-2" aria-live="polite"><div className="h-56 animate-pulse rounded-2xl bg-[#dfeae5]" /><div className="h-56 animate-pulse rounded-2xl bg-[#dfeae5]" /></div>}
          {snapshotState === "error" && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900" role="alert"><p className="font-semibold">GitHub data could not be loaded.</p><p className="mt-1">Retry the authenticated connector request, then return to the loaded state when the response is available.</p></div>}
          {snapshotState === "empty" && <div className="mt-6 rounded-2xl border border-dashed border-[#cbd9d4] bg-white p-10 text-center text-sm text-[#577078]" role="status"><p className="font-semibold text-[#132b34]">No repositories returned.</p><p className="mt-1">The account response was valid, but there is no repository data to display.</p></div>}
          {snapshotState === "loaded" && <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {repositories.map((repository) => <article key={repository.nameWithOwner} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#dce7e4] transition-transform hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-4"><div><h3 className="break-all font-mono text-base font-semibold">{repository.nameWithOwner}</h3><p className="mt-3 text-sm leading-6 text-[#577078]">{repository.description}</p></div>{repository.isPrivate ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f0f4f2] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#577078]"><LockKeyhole size={12} /> Private</span> : <span className="rounded-full bg-[#e9f7d0] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#52761f]">Public</span>}</div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#e5eeeb] pt-4 text-xs font-semibold text-[#667b80]"><span className="inline-flex items-center gap-1.5"><RefreshCw size={13} /> Updated {formatGitHubDate(repository.updatedAt)}</span><span className="inline-flex items-center gap-1.5"><Star size={13} /> {repository.stargazerCount} stars</span><span className="inline-flex items-center gap-1.5"><GitBranch size={13} /> {repository.isFork ? "Fork" : "Original"}</span></div>
              <a href={`https://github.com/${repository.nameWithOwner}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#52761f] hover:text-[#132b34]">Open on GitHub <ExternalLink size={15} /></a>
            </article>)}
          </div>}
        </section>

        <section className="mt-10 grid gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#dce7e4] md:grid-cols-[.8fr_1.2fr] md:p-8">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#6b9631]">Capabilities</p><h2 className="mt-2 text-3xl font-semibold">What the connector supports</h2></div>
          <div className="grid gap-3 sm:grid-cols-2">{githubCapabilities.map((capability, index) => <div key={capability} className="flex gap-3 rounded-xl bg-[#f4f8f6] p-4 text-sm leading-6 text-[#42636b]"><span className="font-mono text-xs font-bold text-[#6b9631]">0{index + 1}</span><span>{capability}</span></div>)}</div>
        </section>

        <p className="mt-8 text-center text-xs leading-5 text-[#809196]">This demonstration page displays a captured result. The deployed website does not directly access personal connector sessions; new GitHub requests are run through the connected agent workflow.</p>
      </div>
    </main>
  );
}
