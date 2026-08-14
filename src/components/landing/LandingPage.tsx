
import { AuthForm } from '../auth';
import ThemeToggle from '../common/ThemeToggle';
import KofiButton from '../common/KofiButton/KofiButton';
import DiscordButton from '../common/DiscordButton/DiscordButton';
import Footer from '../layout/Footer';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LandingPage = ({ onAuthSuccess }) => {
  const features = [
    'Plan mitigation strategies for FFXIV raids',
    'Drag and drop mitigation abilities',
    'Track cooldowns and optimize timing',
    'Save and share your plans',
    'Support for all jobs and boss encounters',
    'Real-time collaboration with your team'
  ];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background p-4 pt-20 text-foreground transition-colors duration-300 sm:p-8">
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(var(--color-foreground) 1px, transparent 1px),
            linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px'
        }}
      />
      
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, var(--background) 70%)'
        }}
      />

      {/* Desktop: All buttons visible */}
      <div className="hidden md:flex absolute top-8 right-8 z-10 items-center gap-2 animate-fade-in">
        <KofiButton />
        <DiscordButton />
        <ThemeToggle />
      </div>

      {/* Mobile: Theme toggle + Menu */}
      <div className="flex md:hidden absolute top-4 right-4 z-10 items-center gap-2 animate-fade-in">
        <ThemeToggle />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background/80 backdrop-blur" aria-label="Open community links">
              <Menu className="h-4 w-4" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px]">
            <SheetHeader className="sr-only">
              <SheetTitle>Community links</SheetTitle>
              <SheetDescription>Support MitPlan or join the Discord community.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 mt-8">
              <KofiButton />
              <DiscordButton />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center py-8 sm:pb-16">
        <div className="grid w-full max-w-[1200px] grid-cols-1 items-center gap-8 px-0 sm:px-4 lg:grid-cols-2 lg:gap-24">
          <section className="space-y-3 text-foreground sm:space-y-6">
            <div className="flex items-center gap-4 animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s' }}>
              <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                M
              </div>
              <h1 className="m-0 text-4xl font-bold tracking-tight text-foreground">
                MitPlan
              </h1>
            </div>

            <h2 className="m-0 text-xl font-medium text-muted-foreground animate-fade-in-up opacity-0" style={{ animationDelay: '0.2s' }}>
              FFXIV Mitigation Planner
            </h2>

            <p className="hidden max-w-[480px] text-base leading-relaxed text-muted-foreground opacity-0 animate-fade-in-up sm:block" style={{ animationDelay: '0.3s' }}>
              Plan and optimize mitigation strategies for your raid team. 
              Track cooldowns, coordinate abilities, and execute flawlessly.
            </p>

            <ul className="m-0 hidden list-none space-y-3 p-0 pt-2 sm:block">
              {features.map((feature, index) => (
                <li
                  key={index}
                  className={`flex items-center gap-3 text-sm text-muted-foreground animate-fade-in-up opacity-0 stagger-${index + 1} hover:text-foreground transition-colors duration-200`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs shrink-0">
                    ✓
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="w-full justify-self-center opacity-0 animate-scale-in lg:justify-self-end" style={{ animationDelay: '0.4s' }}>
            <AuthForm onSuccess={onAuthSuccess} />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
