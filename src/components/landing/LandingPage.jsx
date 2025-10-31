
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
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)] flex flex-col p-8 relative transition-colors duration-300 overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 pointer-events-none opacity-50" style={{ background: 'var(--gradient-mesh)' }} />

      {/* Top navigation */}
      <div className="absolute top-8 right-8 z-10 flex items-center gap-2 animate-fade-in">
        <KofiButton />
        <DiscordButton />
        <ThemeToggle />
      </div>

      <main className="flex-1 flex items-center justify-center relative z-10 pb-16">
        <div className="w-full max-w-[1280px] grid grid-cols-1 md:grid-cols-2 gap-20 items-center px-4">
          {/* Left section - Hero content */}
          <section className="text-[var(--color-text)] space-y-8">
            {/* Logo and title */}
            <div className="mb-10 flex items-center gap-5 animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s' }}>
              <div className="relative group">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-300" />
                <div className="relative h-[72px] w-[72px] rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-[2.5rem] font-bold text-white shadow-lg">
                  M
                </div>
              </div>
              <h1 className="m-0 text-5xl font-bold tracking-tight bg-gradient-to-r from-[var(--color-text)] to-[var(--color-textSecondary)] bg-clip-text">
                MitPlan
              </h1>
            </div>

            {/* Subtitle */}
            <h2 className="m-0 text-3xl font-semibold text-[var(--color-textSecondary)] leading-tight animate-fade-in-up opacity-0" style={{ animationDelay: '0.2s' }}>
              FFXIV Mitigation Planner
            </h2>

            {/* Description */}
            <p className="text-lg leading-relaxed text-[var(--color-textSecondary)] max-w-[540px] animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s' }}>
              The ultimate tool for Final Fantasy XIV raiders to plan and optimize
              their mitigation strategies. Create detailed plans, track cooldowns,
              and coordinate with your team for perfect raid execution.
            </p>

            {/* Features list */}
            <ul className="list-none p-0 m-0 space-y-4 pt-4">
              {features.map((feature, index) => (
                <li
                  key={index}
                  className={`flex items-center gap-4 text-base text-[var(--color-text)] animate-fade-in-up opacity-0 stagger-${index + 1}`}
                >
                  <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] font-bold text-white text-sm shrink-0 shadow-md">
                    <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] opacity-50 blur-md" />
                    <span className="relative">✓</span>
                  </span>
                  <span className="font-medium">{feature}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Right section - Auth form */}
          <section className="animate-scale-in opacity-0 self-start" style={{ animationDelay: '0.4s' }}>
            <AuthForm onSuccess={onAuthSuccess} />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
