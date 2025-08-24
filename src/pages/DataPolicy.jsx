import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/common/ThemeToggle';

const PrivacyContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.6;
  transition: background 0.3s ease, color 0.3s ease;


`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
`;

const BackButton = styled.button`
  background: transparent;
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.hover};
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.colors.primary};

`;

const LastUpdated = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-style: italic;
  margin-bottom: 2rem;
`;

const Section = styled.section`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.text};
`;

const SubsectionTitle = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 0.75rem;
  margin-top: 1.5rem;
  color: ${props => props.theme.colors.text};
`;

const Paragraph = styled.p`
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.text};
`;

const List = styled.ul`
  margin-bottom: 1rem;
  padding-left: 1.5rem;
  
  li {
    margin-bottom: 0.5rem;
    color: ${props => props.theme.colors.text};
  }
`;

const ContactInfo = styled.div`
  background: ${props => props.theme.colors.cardBackground};
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
  margin-top: 2rem;
`;

const DataPolicy = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <PrivacyContainer>
      <Header>
        <BackButton onClick={handleBack}>← Back</BackButton>
        <ThemeToggle />
      </Header>

      <Title>Privacy Policy</Title>
      <LastUpdated>Last updated: {new Date().toLocaleDateString()}</LastUpdated>

      <Section>
        <SectionTitle>1. Introduction</SectionTitle>
        <Paragraph>
          Welcome to MitPlan ("we," "our," or "us"). This Privacy Policy explains how we collect, 
          use, disclose, and safeguard your information when you use our Final Fantasy XIV mitigation 
          planning web application and related services.
        </Paragraph>
        <Paragraph>
          By using MitPlan, you agree to the collection and use of information in accordance with 
          this Privacy Policy. If you do not agree with our policies and practices, do not use our service.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>2. Information We Collect</SectionTitle>
        
        <SubsectionTitle>2.1 Account Information</SubsectionTitle>
        <Paragraph>When you create an account, we collect:</Paragraph>
        <List>
          <li>Email address (for authentication)</li>
          <li>Display name (optional, for collaboration features)</li>
          <li>Password (encrypted and stored securely via Firebase Authentication)</li>
        </List>

        <SubsectionTitle>2.2 Plan Data</SubsectionTitle>
        <Paragraph>We store your mitigation plans, which may include:</Paragraph>
        <List>
          <li>Plan names and metadata</li>
          <li>Selected FFXIV jobs and boss encounters</li>
          <li>Mitigation ability assignments and timing</li>
          <li>Tank position assignments</li>
          <li>Plan sharing and collaboration settings</li>
        </List>

        <SubsectionTitle>2.3 Anonymous User Data</SubsectionTitle>
        <Paragraph>For anonymous users, we collect:</Paragraph>
        <List>
          <li>Display name (for collaboration)</li>
          <li>Temporary session identifiers</li>
          <li>Plan access history (stored locally)</li>
        </List>

        <SubsectionTitle>2.4 Usage Analytics</SubsectionTitle>
        <Paragraph>We use Firebase Analytics to collect:</Paragraph>
        <List>
          <li>Page views and user interactions</li>
          <li>Feature usage patterns</li>
          <li>Performance metrics</li>
          <li>Error reports and crash data</li>
        </List>

        <SubsectionTitle>2.5 Technical Information</SubsectionTitle>
        <List>
          <li>IP address and browser information</li>
          <li>Device type and operating system</li>
          <li>Session duration and timestamps</li>
          <li>Real-time collaboration activity</li>
        </List>
      </Section>

      <Section>
        <SectionTitle>3. How We Use Your Information</SectionTitle>
        <Paragraph>We use the collected information for:</Paragraph>
        <List>
          <li>Providing and maintaining the MitPlan service</li>
          <li>User authentication and account management</li>
          <li>Storing and synchronizing your mitigation plans</li>
          <li>Enabling real-time collaboration features</li>
          <li>Improving our service through analytics</li>
          <li>Communicating with you about service updates</li>
          <li>Ensuring security and preventing abuse</li>
        </List>
      </Section>

      <Section>
        <SectionTitle>4. Data Storage and Security</SectionTitle>
        
        <SubsectionTitle>4.1 Firebase Services</SubsectionTitle>
        <Paragraph>
          We use Google Firebase for data storage and authentication, which provides:
        </Paragraph>
        <List>
          <li>Encrypted data transmission (HTTPS/TLS)</li>
          <li>Secure authentication protocols</li>
          <li>Regular security updates and monitoring</li>
          <li>Compliance with industry security standards</li>
        </List>

        <SubsectionTitle>4.2 Local Storage</SubsectionTitle>
        <Paragraph>
          Some data is stored locally in your browser for offline functionality and performance:
        </Paragraph>
        <List>
          <li>Plan data (as backup and for offline access)</li>
          <li>User preferences and settings</li>
          <li>Anonymous user session information</li>
        </List>
      </Section>

      <Section>
        <SectionTitle>5. Data Sharing and Disclosure</SectionTitle>
        <Paragraph>We do not sell, trade, or rent your personal information. We may share data in these limited circumstances:</Paragraph>
        <List>
          <li><strong>Plan Collaboration:</strong> When you share plans, other users can view and edit the shared content</li>
          <li><strong>Service Providers:</strong> With Firebase/Google for hosting and analytics</li>
          <li><strong>Legal Requirements:</strong> If required by law or to protect our rights</li>
          <li><strong>Business Transfer:</strong> In case of merger, acquisition, or sale of assets</li>
        </List>
      </Section>

      <Section>
        <SectionTitle>6. Your Rights and Choices</SectionTitle>
        
        <SubsectionTitle>6.1 Account Management</SubsectionTitle>
        <List>
          <li>Access and update your account information</li>
          <li>Delete your account and associated data</li>
          <li>Export your mitigation plans</li>
          <li>Control plan sharing and collaboration settings</li>
        </List>

        <SubsectionTitle>6.2 Anonymous Users</SubsectionTitle>
        <List>
          <li>Clear local storage to remove anonymous session data</li>
          <li>Create an account to migrate anonymous plans</li>
        </List>

        <SubsectionTitle>6.3 Analytics Opt-out</SubsectionTitle>
        <Paragraph>
          You can opt out of analytics tracking through your browser settings or by using 
          ad-blocking extensions that block Firebase Analytics.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>7. Data Retention</SectionTitle>
        <List>
          <li><strong>Account Data:</strong> Retained until account deletion</li>
          <li><strong>Plan Data:</strong> Retained until manually deleted by user</li>
          <li><strong>Analytics Data:</strong> Retained according to Firebase Analytics policies (typically 14 months)</li>
          <li><strong>Anonymous Sessions:</strong> Automatically expire after inactivity</li>
        </List>
      </Section>

      <Section>
        <SectionTitle>8. Third-Party Services</SectionTitle>
        <Paragraph>MitPlan integrates with the following third-party services:</Paragraph>
        <List>
          <li><strong>Firebase (Google):</strong> Authentication, database, and analytics</li>
          <li><strong>XIVAPI:</strong> Final Fantasy XIV game data and icons</li>
          <li><strong>Vercel:</strong> Web hosting and deployment</li>
          <li><strong>Ko-fi:</strong> Donation platform (external link)</li>
          <li><strong>Discord:</strong> Community platform (external link)</li>
        </List>
        <Paragraph>
          These services have their own privacy policies, and we encourage you to review them.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>9. Children's Privacy</SectionTitle>
        <Paragraph>
          MitPlan is not intended for children under 13. We do not knowingly collect personal 
          information from children under 13. If you become aware that a child has provided 
          us with personal information, please contact us so we can delete such information.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>10. International Users</SectionTitle>
        <Paragraph>
          MitPlan is hosted in the United States. If you are accessing our service from outside 
          the US, please be aware that your information may be transferred to, stored, and 
          processed in the US where our servers are located.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>11. Changes to This Privacy Policy</SectionTitle>
        <Paragraph>
          We may update this Privacy Policy from time to time. We will notify you of any changes 
          by posting the new Privacy Policy on this page and updating the "Last updated" date. 
          You are advised to review this Privacy Policy periodically for any changes.
        </Paragraph>
      </Section>

      <ContactInfo>
        <SectionTitle>12. Contact Us</SectionTitle>
        <Paragraph>
          If you have any questions about this Privacy Policy or our data practices, please contact us:
        </Paragraph>
        <List>
          <li><strong>Email:</strong> eugenepark404@gmail.com</li>
          <li><strong>Discord:</strong> Join our community server for support</li>
          <li><strong>GitHub:</strong> https://github.com/MarbleSodas/MitPlan</li>
        </List>
      </ContactInfo>
    </PrivacyContainer>
  );
};

export default DataPolicy;
