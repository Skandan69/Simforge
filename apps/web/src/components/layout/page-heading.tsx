export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p></div>{action}</div>;
}
