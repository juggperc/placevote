import { SignInButton } from '@clerk/clerk-react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  AudioWaveform,
  Building2,
  FileStack,
  Map,
  MessageSquare,
  Network,
  ShieldCheck,
  Vote,
} from 'lucide-react';

const HERO_METRICS = [
  { label: 'Submissions triaged', value: '12.4k' },
  { label: 'Hotspots surfaced', value: '48' },
  { label: 'Briefings generated', value: '219' },
];

const FEATURE_PANELS = [
  {
    title: 'Live civic inbox',
    body: 'Drop consultation files, planning objections, and service requests into one operating surface.',
    icon: FileStack,
  },
  {
    title: 'Entity graphing',
    body: 'Trace how places, projects, submissions, and risk signals connect before the meeting starts.',
    icon: Network,
  },
  {
    title: 'Spatial heatmaps',
    body: 'Turn friction into a geographic layer so your team knows where pressure is rising.',
    icon: Map,
  },
];

const WORKFLOW_STEPS = [
  {
    title: 'Ingest',
    body: 'Upload PDFs, spreadsheets, geojson, and shapefiles without manually reshaping the data.',
  },
  {
    title: 'Interpret',
    body: 'AI classifies the material, builds the ontology, and identifies the strongest emerging patterns.',
  },
  {
    title: 'Brief',
    body: 'Teams chat with the evidence base, export reports, and walk into council with usable signal.',
  },
];

const EVIDENCE_CARDS = [
  {
    label: 'Ontology signal',
    headline: 'Projects, suburbs, and objections cluster automatically.',
  },
  {
    label: 'Operations view',
    headline: 'Uploads stay traceable from ingestion to graph and friction output.',
  },
  {
    label: 'Council cadence',
    headline: 'Built for briefings, workshops, and planning reviews under real time pressure.',
  },
];

function fadeUp(delay = 0, reducedMotion = false) {
  if (reducedMotion) {
    return {
      initial: { opacity: 1, y: 0 },
      whileInView: { opacity: 1, y: 0 },
      transition: { duration: 0 },
      viewport: { once: true, amount: 0.3 },
    };
  }

  return {
    initial: { opacity: 0, y: 26 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
    viewport: { once: true, amount: 0.3 },
  };
}

export default function LandingPage() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(75,94,204,0.14),transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2f9_45%,#f7f8fb_100%)] text-slate-950">
      <div className="pointer-events-none fixed inset-0 opacity-50 [background-image:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.16),transparent_70%)]" />

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,0.16)]">
              <Vote className="h-4 w-4" />
            </div>
            <div>
              <div
                className="text-lg font-semibold tracking-tight text-slate-950"
                style={{ fontFamily: 'Geist Variable, Inter, sans-serif' }}
              >
                Placevote
              </div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                civic intelligence
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <a href="#platform" className="transition-colors hover:text-slate-950">Platform</a>
            <a href="#workflow" className="transition-colors hover:text-slate-950">Workflow</a>
            <a href="#evidence" className="transition-colors hover:text-slate-950">Evidence</a>
          </div>

          <SignInButton mode="modal">
            <button className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300/80 bg-white px-5 text-sm font-medium text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-950 hover:shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
              Sign In
            </button>
          </SignInButton>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-24">
          <motion.div
            className="flex flex-col justify-center"
            initial={reducedMotion ? false : { opacity: 0, y: 32 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 shadow-sm">
              <AudioWaveform className="h-3.5 w-3.5 text-indigo-600" />
              councils need signal, not noise
            </div>

            <h1
              className="max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl lg:text-7xl"
              style={{ fontFamily: 'Geist Variable, Inter, sans-serif' }}
            >
              Community evidence,
              <span className="block text-indigo-700">stitched into one briefing surface.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Placevote turns uploads, consultation responses, and planning signals into a council-ready operating picture with chat, ontology mapping, and geospatial friction analysis.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <SignInButton mode="modal">
                <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-7 text-sm font-medium text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800">
                  Open Workspace
                  <ArrowRight className="h-4 w-4" />
                </button>
              </SignInButton>

              <a
                href="#workflow"
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300/80 bg-white/80 px-7 text-sm font-medium text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-600 hover:text-indigo-700"
              >
                See the system flow
              </a>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {HERO_METRICS.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  className="rounded-3xl border border-white/80 bg-white/75 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur"
                  {...fadeUp(reducedMotion ? 0 : index * 0.08, !!reducedMotion)}
                >
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                    {metric.label}
                  </div>
                  <div
                    className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950"
                    style={{ fontFamily: 'Geist Variable, Inter, sans-serif' }}
                  >
                    {metric.value}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="relative flex items-center justify-center"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={reducedMotion ? undefined : { opacity: 1, scale: 1 }}
            transition={reducedMotion ? undefined : { duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute left-1/2 top-10 h-44 w-44 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,0.28),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_35%)]" />
              <div className="relative rounded-[1.6rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-indigo-200/70">
                      operations room
                    </div>
                    <div
                      className="mt-2 text-2xl font-semibold tracking-[-0.04em]"
                      style={{ fontFamily: 'Geist Variable, Inter, sans-serif' }}
                    >
                      One workspace for every civic signal.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <Building2 className="h-5 w-5 text-indigo-200" />
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  {FEATURE_PANELS.map((panel, index) => {
                    const Icon = panel.icon;
                    return (
                      <motion.div
                        key={panel.title}
                        className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4"
                        initial={reducedMotion ? false : { opacity: 0, x: 22 }}
                        animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
                        transition={reducedMotion ? undefined : { duration: 0.7, delay: 0.18 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="rounded-2xl bg-white/10 p-3 text-indigo-200">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{panel.title}</div>
                            <p className="mt-1 text-sm leading-6 text-slate-300">
                              {panel.body}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <motion.div
                  className="mt-5 rounded-[1.4rem] border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100"
                  initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                  animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={reducedMotion ? undefined : { duration: 0.7, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4" />
                    Ontology, uploads, and mapping stay inside one traceable workflow.
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="platform" className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            {EVIDENCE_CARDS.map((card, index) => (
              <motion.article
                key={card.label}
                className="rounded-[1.75rem] border border-slate-200/80 bg-white/78 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur"
                {...fadeUp(reducedMotion ? 0 : index * 0.08, !!reducedMotion)}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {card.label}
                </div>
                <p
                  className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.04em] text-slate-950"
                  style={{ fontFamily: 'Geist Variable, Inter, sans-serif' }}
                >
                  {card.headline}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0, !!reducedMotion)}>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              workflow
            </div>
            <div className="mt-4 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <h2
                  className="text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl"
                  style={{ fontFamily: 'Geist Variable, Inter, sans-serif' }}
                >
                  From raw files to council-ready narrative.
                </h2>
              </div>
              <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                The platform is designed for teams that need to move from messy submissions to a clear briefing pack fast, without losing provenance or context along the way.
              </p>
            </div>
          </motion.div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {WORKFLOW_STEPS.map((step, index) => (
              <motion.article
                key={step.title}
                className="rounded-[1.75rem] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.16)]"
                {...fadeUp(reducedMotion ? 0 : index * 0.1, !!reducedMotion)}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200/70">
                  0{index + 1}
                </div>
                <h3
                  className="mt-6 text-3xl font-semibold tracking-[-0.04em]"
                  style={{ fontFamily: 'Geist Variable, Inter, sans-serif' }}
                >
                  {step.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {step.body}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="evidence" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <motion.div
            className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/78 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.1)] backdrop-blur sm:p-10"
            {...fadeUp(0, !!reducedMotion)}
          >
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700">
                  <MessageSquare className="h-3.5 w-3.5" />
                  built for high-stakes conversations
                </div>
                <h2
                  className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl"
                  style={{ fontFamily: 'Geist Variable, Inter, sans-serif' }}
                >
                  Replace fragmented consultation tooling with one calm command surface.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                  Give your planners, strategists, and engagement leads a single place to upload evidence, interrogate it, and act on what matters.
                </p>
              </div>

              <SignInButton mode="modal">
                <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-indigo-600 px-7 text-sm font-medium text-white shadow-[0_18px_40px_rgba(79,70,229,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-500">
                  Start in Placevote
                  <ArrowRight className="h-4 w-4" />
                </button>
              </SignInButton>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
