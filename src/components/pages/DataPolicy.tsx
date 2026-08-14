import React from 'react';
import { useNavigate } from '@/lib/navigation';
import ThemeToggle from '../common/ThemeToggle';

const PrivacyContainer = ({ children, className = '', ...rest }) => (
  <div
    {...rest}
    className={`min-h-screen bg-background text-foreground px-6 py-8 max-w-[800px] mx-auto leading-7 transition-colors ${className}`}
  >
    {children}
  </div>
);

const Header = ({ children, className = '', ...rest }) => (
  <div
    {...rest}
    className={`flex justify-between items-center mb-8 pb-4 border-b border-border flex-col gap-4 sm:flex-row sm:items-center ${className}`}
  >
    {children}
  </div>
);

const BackButton = ({ children, className = '', ...rest }) => (
  <button
    {...rest}
    className={`bg-transparent border border-border text-foreground px-4 py-2 rounded-lg cursor-pointer text-sm transition-colors hover:bg-muted ${className}`}
  >
    {children}
  </button>
);

const Title = ({ children, className = '', ...rest }) => (
  <h1 {...rest} className={`text-2xl sm:text-3xl font-semibold tracking-tight mb-2 text-primary ${className}`}>{children}</h1>
);

const LastUpdated = ({ children, className = '', ...rest }) => (
  <p {...rest} className={`text-muted-foreground italic mb-8 ${className}`}>{children}</p>
);

const Section = ({ children, className = '', ...rest }) => (
  <section {...rest} className={`mb-8 ${className}`}>{children}</section>
);

const SectionTitle = ({ children, className = '', ...rest }) => (
  <h2 {...rest} className={`text-lg font-semibold mb-4 ${className}`}>{children}</h2>
);

const SubsectionTitle = ({ children, className = '', ...rest }) => (
  <h3 {...rest} className={`text-base font-semibold mb-3 mt-6 ${className}`}>{children}</h3>
);

const Paragraph = ({ children, className = '', ...rest }) => (
  <p {...rest} className={`mb-4 ${className}`}>{children}</p>
);

const List = ({ children, className = '', ...rest }) => (
  <ul {...rest} className={`mb-4 pl-6 list-disc space-y-2 ${className}`}>{children}</ul>
);

const ContactInfo = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`bg-card p-6 rounded-xl border border-border mt-8 ${className}`}>{children}</div>
);

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
          <li>Password credentials (securely processed by Supabase Authentication)</li>
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

        <SubsectionTitle>2.3 Usage Analytics</SubsectionTitle>
        <Paragraph>We use Vercel Analytics and Speed Insights to collect:</Paragraph>
        <List>
          <li>Page views and user interactions</li>
          <li>Feature usage patterns</li>
          <li>Performance metrics</li>
          <li>Web performance measurements</li>
        </List>

        <SubsectionTitle>2.4 Technical Information</SubsectionTitle>
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
        
        <SubsectionTitle>4.1 Supabase Services</SubsectionTitle>
        <Paragraph>
          We use Supabase for authentication, data storage, authorization, and realtime synchronization, including:
        </Paragraph>
        <List>
          <li>Encrypted data transmission (HTTPS/TLS)</li>
          <li>Secure authentication protocols</li>
          <li>Regular security updates and monitoring</li>
          <li>Compliance with industry security standards</li>
        </List>

        <SubsectionTitle>4.2 Local Storage</SubsectionTitle>
        <Paragraph>
          Some data is stored locally in your browser for performance and recovery flows:
        </Paragraph>
        <List>
          <li>Temporary UI preferences and settings</li>
          <li>User preferences and settings</li>
          <li>Legacy local mitigation plans that can be imported after sign-in</li>
        </List>
      </Section>

      <Section>
        <SectionTitle>5. Data Sharing and Disclosure</SectionTitle>
        <Paragraph>We do not sell, trade, or rent your personal information. We may share data in these limited circumstances:</Paragraph>
        <List>
          <li><strong>Plan Collaboration:</strong> Public links can be viewed by anyone, but editing and real-time collaboration require authentication</li>
          <li><strong>Service Providers:</strong> With Supabase for authentication and data services, and Vercel for hosting and analytics</li>
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

        <SubsectionTitle>6.2 Local Browser Data</SubsectionTitle>
        <List>
          <li>Clear local storage to remove locally stored legacy plan data</li>
          <li>Sign in to import older locally stored plans into your account</li>
        </List>

        <SubsectionTitle>6.3 Analytics Opt-out</SubsectionTitle>
        <Paragraph>
          You can opt out of analytics tracking through your browser settings or by using 
          privacy tools or ad-blocking extensions that block Vercel Analytics.
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>7. Data Retention</SectionTitle>
        <List>
          <li><strong>Account Data:</strong> Retained until account deletion</li>
          <li><strong>Plan Data:</strong> Retained until manually deleted by user</li>
          <li><strong>Analytics Data:</strong> Retained according to our Vercel project settings and applicable Vercel policies</li>
          <li><strong>Authentication Sessions:</strong> Expire or are revoked according to account and security settings</li>
        </List>
      </Section>

      <Section>
        <SectionTitle>8. Third-Party Services</SectionTitle>
        <Paragraph>MitPlan integrates with the following third-party services:</Paragraph>
        <List>
          <li><strong>Supabase:</strong> Authentication, database, and realtime services</li>
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
