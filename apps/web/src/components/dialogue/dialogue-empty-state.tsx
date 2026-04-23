export function DialogueEmptyState() {
  return (
    <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white/45 p-10 text-center text-stone-500">
      <p className="text-sm uppercase tracking-[0.3em] text-stone-400">Preview</p>
      <p className="mt-4 text-2xl font-semibold text-stone-700">
        生成后的中文对话文章会显示在这里
      </p>
      <div className="mx-auto mt-8 grid max-w-2xl gap-4 text-left">
        <div className="h-8 w-2/3 rounded-full bg-stone-200/80" />
        <div className="h-5 w-1/2 rounded-full bg-stone-200/70" />
        <div className="space-y-3 rounded-2xl bg-white/70 p-5">
          <div className="h-4 w-24 rounded-full bg-stone-200" />
          <div className="h-4 w-full rounded-full bg-stone-200/70" />
          <div className="h-4 w-5/6 rounded-full bg-stone-200/70" />
        </div>
      </div>
    </div>
  );
}
