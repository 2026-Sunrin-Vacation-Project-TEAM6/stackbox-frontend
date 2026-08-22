import Link from 'next/link'

import { SessionLink } from '@/components/features/SessionLink'
import { SystemStatus } from '@/components/features/system-status'

/*
 * §16 Landing.
 *
 * Written against §22–§29: no gradient hero, no glassmorphism, no three-column
 * icon-title-description card grid, no invented metrics, and no "unlock your
 * potential" register. What is left is the thing itself — a statement of what
 * StackBox does, the three surfaces named plainly, and the one path in.
 *
 * The scale is deliberate rather than default. The previous version set the
 * headline at 32px and the body at 15px on 14%-alpha hairlines, which is the
 * house style of every generated developer-tool landing page; at that weight
 * "brutalist" is a claim the page does not back up. Here the chrome band is
 * inverted ink, the section rules are full-ink 2px, and the surfaces are a
 * numbered editorial list — structure carrying the hierarchy instead of size
 * alone (§26 still rules out a screen-filling hero).
 */

const SURFACES = [
  {
    name: 'Document',
    detail:
      'Markdown blocks with live collaborative editing. Two people typing in the same paragraph merge instead of overwriting each other.',
  },
  {
    name: 'Canvas',
    detail:
      'The same blocks, positioned freely on an infinite canvas. Switching surface changes the arrangement, not the content.',
  },
  {
    name: 'Code',
    detail:
      'Python and JavaScript blocks run in a sandbox and keep their output beneath them. Everyone in the document sees the same result.',
  },
]

const CAPABILITIES = [
  'Turn the document into a slide deck, generated from its own text.',
  'Import files from a connected GitHub repository as blocks.',
  'Summarize or draft into the document from the command palette.',
]

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/*
       * The same inverted ink band the signed-in app wears, so arriving at the
       * product is a continuation rather than a different website.
       */}
      <header className="flex h-13 shrink-0 items-stretch justify-between bg-ink text-on-ink">
        <span className="flex items-center gap-2 border-r border-on-ink-rule px-4">
          <span className="sb-label-lg">STACKBOX</span>
          <span className="h-2 w-2 bg-accent" aria-hidden />
        </span>

        <SessionLink className="sb-label flex items-center border-l border-on-ink-rule px-4 text-on-ink-muted transition-colors duration-100 hover:bg-white/10 hover:text-on-ink" />
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-8 py-14">
        {/*
         * A statement, not a slogan. It says which three things live in one
         * place, because that is the only claim this product actually makes.
         */}
        <h1 className="sb-display max-w-[30ch]">
          Documents, canvas, and runnable code in one workspace.
        </h1>

        <p className="max-w-[56ch] pt-6 text-[19px] leading-[1.55] text-muted">
          Write a document, draw next to it, and run the code inside it — without moving the work
          into a second tool. Everything in a StackBox document is a block, and every block is
          editable by everyone in it at the same time.
        </p>

        <div className="flex flex-wrap items-center gap-6 pt-10">
          {/*
           * One path in, and it looks like a physical object: solid primary with
           * the hard offset. §13 allows shadow that states layer, and a button
           * that sits above the page is the one place it says something.
           */}
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center border-2 border-text bg-primary px-6 text-[16px] font-semibold text-background shadow-hard-sm transition-[background-color,box-shadow,translate] duration-100 hover:bg-secondary hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            Get started
          </Link>
          <SessionLink className="sb-label-lg border-b-2 border-transparent pb-0.5 text-muted transition-colors duration-100 hover:border-text hover:text-text" />
        </div>

        <section className="pt-20">
          <h2 className="sb-label border-b-2 border-text pb-2.5 text-muted">Surfaces</h2>

          {/*
           * A numbered definition list, not three cards (§22.1). The ordinal is
           * the same gutter device the document editor uses for blocks, so the
           * landing page is describing the product in the product's own idiom.
           */}
          <dl className="flex flex-col">
            {SURFACES.map((surface, index) => (
              <div
                key={surface.name}
                className="grid grid-cols-[2.5rem_10rem_1fr] gap-6 border-b border-rule py-6"
              >
                <span className="sb-meta pt-1 text-faint tabular-nums" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <dt className="text-[21px] leading-tight font-bold tracking-[-0.02em]">
                  {surface.name}
                </dt>
                <dd className="max-w-[58ch] text-[16px] leading-[1.6] text-muted">
                  {surface.detail}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="pt-16">
          <h2 className="sb-label border-b-2 border-text pb-2.5 text-muted">
            What the document can do
          </h2>

          <ul className="flex flex-col">
            {CAPABILITIES.map((item) => (
              <li
                key={item}
                className="flex items-start gap-5 border-b border-rule py-4 text-[16px] leading-[1.6]"
              >
                <span className="mt-2 h-2.5 w-2.5 shrink-0 bg-accent" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="flex shrink-0 items-center justify-between gap-4 border-t-2 border-text px-5 py-4">
        <span className="sb-label text-faint">StackBox</span>
        {/* Real state, read from the API — not a decorative badge. */}
        <SystemStatus />
      </footer>
    </div>
  )
}
