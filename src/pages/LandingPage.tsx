import { Vote, MessageSquare, Network, Map, Shield, Zap, Users } from 'lucide-react';
import { SignInButton } from '@clerk/clerk-react';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/20">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Vote className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Placevote</span>
          </div>
          
          <SignInButton mode="modal">
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-6">
              Sign In
            </button>
          </SignInButton>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Community Engagement,<br />
              <span className="text-primary">Intelligently Amplified</span>
            </h1>
            
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Transform how your council understands and responds to community sentiment. 
              AI-powered analysis of public submissions, geospatial mapping of concerns, 
              and actionable insights for better decision-making.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <SignInButton mode="modal">
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 text-base">
                  Get Started Free
                </button>
              </SignInButton>
              <a 
                href="#features" 
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8 text-base"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                See How It Works
              </a>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-border/40 bg-muted/30 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-background border border-border/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">AI-Powered Chat</h3>
                <p className="text-sm text-muted-foreground">
                  Ask questions about community submissions and get instant insights from your consultation data.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-background border border-border/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <Network className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Ontology Graph</h3>
                <p className="text-sm text-muted-foreground">
                  Visualize relationships between themes, locations, and stakeholders in your community consultations.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-background border border-border/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <Map className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Geospatial Intel</h3>
                <p className="text-sm text-muted-foreground">
                  Heat maps showing friction scores by suburb. Prioritize resources where community concerns are highest.
                </p>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3 mt-8">
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-background border border-border/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Instant Classification</h3>
                <p className="text-sm text-muted-foreground">
                  Upload PDFs, spreadsheets, or JSON. AI automatically classifies and extracts key themes.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-background border border-border/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Privacy First</h3>
                <p className="text-sm text-muted-foreground">
                  Your data stays on your infrastructure. AI processes what you choose to analyse.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-background border border-border/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Team Collaboration</h3>
                <p className="text-sm text-muted-foreground">
                  Role-based access for your team. Share insights and reports across your organization.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs">
                <Vote className="h-3 w-3" />
              </div>
              <span className="text-sm font-medium">Placevote</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for councils, by understanding communities.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}