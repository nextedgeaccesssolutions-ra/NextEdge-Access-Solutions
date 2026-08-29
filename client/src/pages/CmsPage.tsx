import { useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type Block = { id: string; type: string; content: { title?: string; body?: string; tone?: string; imageUrl?: string }; visible?: boolean };

export default function CmsPage({ params }: { params: { slug: string } }) {
  const { data: pages = [], isLoading } = trpc.publicSite.pages.useQuery();
  const page = pages.find((item) => item.slug === params.slug);
  const blocks = useMemo(() => {
    if (!page) return [] as Block[];
    try { return JSON.parse(page.layout) as Block[]; } catch { return []; }
  }, [page]);

  useEffect(() => {
    if (!page) return;
    try {
      const seo = JSON.parse(page.seo) as { title?: string; description?: string };
      if (seo.title) document.title = seo.title;
      if (seo.description) {
        let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (!tag) { tag = document.createElement("meta"); tag.name = "description"; document.head.appendChild(tag); }
        tag.content = seo.description;
      }
    } catch { document.title = page.title; }
  }, [page]);

  if (isLoading) return <div className="grid min-h-screen place-items-center bg-[#f4f7f5] text-[#66807c]">Loading published page…</div>;
  if (!page) return <div className="grid min-h-screen place-items-center bg-[#102f39] px-6 text-center text-white"><div><h1 className="text-4xl font-semibold">Page not available</h1><p className="mt-4 text-[#c7d5d5]">This page is not published or the address has changed.</p><Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#b6ef3c] px-5 py-3 font-semibold text-[#102f39]"><ArrowLeft size={17} /> Return home</Link></div></div>;

  return <div className="min-h-screen bg-white text-[#132b34]"><header className="border-b border-[#dce7e4] bg-white"><div className="container flex min-h-20 items-center justify-between"><Link href="/" className="flex items-center gap-3"><img src="/manus-storage/NEASPNG1.1_22de2ec7.png" alt="NEAS logo" className="h-12 w-12 rounded-full" /><span className="font-bold tracking-[.12em]">NEXTEDGE</span></Link><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={15} /> Main website</Link></div></header><main>{blocks.filter((block) => block.visible !== false).map((block, index) => <section key={block.id} className={`py-16 md:py-24 ${block.content.tone === "deep" ? "bg-[#102f39] text-white" : block.content.tone === "mint" ? "bg-[#e8f4e9]" : "bg-white"}`}><div className={`container grid gap-8 ${block.content.imageUrl ? "md:grid-cols-2 md:items-center" : ""}`}><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#6b9631]">{block.type} · {String(index + 1).padStart(2, "0")}</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">{block.content.title}</h1>{block.content.body && <p className="mt-5 max-w-3xl text-lg leading-8 opacity-80">{block.content.body}</p>}</div>{block.content.imageUrl && <img src={block.content.imageUrl} alt="" className="max-h-[440px] w-full rounded-xl object-cover" />}</div></section>)}</main></div>;
}
