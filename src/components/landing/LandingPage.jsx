import React from 'react';
import styled from 'styled-components';
import AuthForm from '../auth/AuthForm';
import ThemeToggle from '../common/ThemeToggle';
import KofiButton from '../common/KofiButton/KofiButton';
import DiscordButton from '../common/DiscordButton/DiscordButton';

const LandingContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme?.colors?.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  display: flex;
  flex-direction: column;
  padding: 2rem;
  transition: background 0.3s ease;
  position: relative;
`;

const TopNavigation = styled.div`
  position: absolute;
  top: 2rem;
  right: 2rem;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (max-width: 768px) {
    top: 1rem;
    right: 1rem;
    gap: 0.5rem;
  }

  @media (max-width: 480px) {
    gap: 0.5rem;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
    text-align: center;
  }
`;

const HeroSection = styled.div`
  color: ${props => props.theme?.colors?.text || 'white'};
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const LogoIcon = styled.div`
  width: 60px;
  height: 60px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
`;

const LogoText = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
`;

const Tagline = styled.h2`
  font-size: 1.5rem;
  font-weight: 400;
  margin: 0 0 1.5rem 0;
  opacity: 0.9;
`;

const Description = styled.p`
  font-size: 1.1rem;
  line-height: 1.6;
  opacity: 0.8;
  margin-bottom: 2rem;
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 1rem;
  opacity: 0.9;

  &::before {
    content: '✓';
    background: rgba(255, 255, 255, 0.2);
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    flex-shrink: 0;
  }
`;

const AuthSection = styled.div`
  background: transparent;
  border-radius: 20px;
  padding: 2rem;
`;

const DemoSection = styled.div`
  text-align: center;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(102, 126, 234, 0.2);
`;

const DemoButton = styled.button`
  padding: 0.75rem 2rem;
  background: transparent;
  color: #667eea;
  border: 2px solid #667eea;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #667eea;
    color: white;
  }
`;

const LandingPage = ({ onAuthSuccess, onDemoMode }) => {

  const features = [
    'Plan mitigation strategies for FFXIV raids',
    'Drag and drop mitigation abilities',
    'Track cooldowns and optimize timing',
    'Save and share your plans',
    'Support for all jobs and boss encounters',
    'Real-time collaboration with your team'
  ];

  return (
    <LandingContainer>
      <TopNavigation>
        <KofiButton />
        <DiscordButton />
        <ThemeToggle />
      </TopNavigation>
      <MainContent>
        <ContentWrapper>
        <HeroSection>
          <Logo>
            <LogoIcon>M</LogoIcon>
            <LogoText>MitPlan</LogoText>
          </Logo>
          
          <Tagline>FFXIV Mitigation Planner</Tagline>
          
          <Description>
            The ultimate tool for Final Fantasy XIV raiders to plan and optimize 
            their mitigation strategies. Create detailed plans, track cooldowns, 
            and coordinate with your team for perfect raid execution.
          </Description>
          
          <FeatureList>
            {features.map((feature, index) => (
              <FeatureItem key={index}>{feature}</FeatureItem>
            ))}
          </FeatureList>
        </HeroSection>

        <AuthSection>
          <AuthForm
            onSuccess={onAuthSuccess}
          />

          {onDemoMode && (
            <DemoSection>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                Want to try it first?
              </p>
              <DemoButton onClick={onDemoMode}>
                Try Demo Mode
              </DemoButton>
            </DemoSection>
          )}
        </AuthSection>
        </ContentWrapper>
      </MainContent>
    </LandingContainer>
  );
};

export default LandingPage;
