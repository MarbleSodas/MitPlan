
import AuthForm from '../auth';
import ThemeToggle from '../common/ThemeToggle';
import KofiButton from '../common/KofiButton/KofiButton';
import DiscordButton from '../common/DiscordButton/DiscordButton';
import Footer from '../layout/Footer';

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
    <div className="min-h-screen bg-background text-foreground flex flex-col p-8 relative transition-colors duration-300 overflow-hidden">
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
          background: 'radial-gradient(ellipse at center, transparent 0%, var(--color-background) 70%)'
        }}
      />

      <div className="absolute top-8 right-8 z-10 flex items-center gap-2 animate-fade-in">
        <KofiButton />
        <DiscordButton />
        <ThemeToggle />
      </div>

      <main className="flex-1 flex items-center justify-center relative z-10 pb-16">
        <div className="w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center px-4">
          <section className="text-foreground space-y-6">
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

            <p className="text-base leading-relaxed text-muted-foreground max-w-[480px] animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s' }}>
              Plan and optimize mitigation strategies for your raid team. 
              Track cooldowns, coordinate abilities, and execute flawlessly.
            </p>

            <ul className="list-none p-0 m-0 space-y-3 pt-2">
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

          <section className="animate-scale-in opacity-0 lg:justify-self-end" style={{ animationDelay: '0.4s' }}>
            <AuthForm onSuccess={onAuthSuccess} />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
