
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
    <div className="min-h-screen bg-[linear-gradient(135deg,_#667eea_0%,_#764ba2_100%)] flex flex-col p-8 relative transition-colors duration-300">
      <div className="absolute top-8 right-8 z-10 flex items-center gap-2">
        <KofiButton />
        <DiscordButton />
        <ThemeToggle />
      </div>
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <section className="text-white">
          <div className="mb-8 flex items-center gap-4">
            <div className="h-[60px] w-[60px] rounded-[12px] bg-white flex items-center justify-center text-[2rem] font-bold text-[#667eea]">M</div>
            <h1 className="m-0 text-4xl font-bold">MitPlan</h1>
          </div>

          <h2 className="m-0 mb-6 text-2xl font-normal opacity-90">FFXIV Mitigation Planner</h2>

          <p className="mb-8 text-[1.1rem] leading-relaxed opacity-80">
            The ultimate tool for Final Fantasy XIV raiders to plan and optimize
            their mitigation strategies. Create detailed plans, track cooldowns,
            and coordinate with your team for perfect raid execution.
          </p>

          <ul className="list-none p-0 m-0 space-y-4">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3 text-base opacity-90">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 font-bold text-white shrink-0">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[20px] p-8 bg-transparent">
          <AuthForm
            onSuccess={onAuthSuccess}
          />

          {/* TODO: Anonymous mode feature not fully implemented yet
          <DemoSection>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              Want to try it first?
            </p>
            <DemoButton onClick={handleAnonymousMode}>
              Try Anonymous Mode
            </DemoButton>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              No account required • Plans stored locally
            </p>
          </DemoSection>
          */}
        </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
