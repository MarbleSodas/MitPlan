import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const FooterContainer = styled.footer`
  width: 100%;
  padding: 2rem 0 1rem 0;
  margin-top: auto;
  border-top: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.textSecondary};
  transition: all 0.3s ease;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 1.5rem 0 1rem 0;
  }
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 0 1rem;
    gap: 0.75rem;
  }
`;

const FooterLinks = styled.div`
  display: flex;
  gap: 2rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: 1rem;
    flex-direction: column;
  }
`;

const FooterLink = styled(Link)`
  color: ${props => props.theme.colors.textSecondary};
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.primary};
    text-decoration: underline;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.85rem;
  }
`;

const ExternalLink = styled.a`
  color: ${props => props.theme.colors.textSecondary};
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.primary};
    text-decoration: underline;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.85rem;
  }
`;

const Copyright = styled.div`
  text-align: center;
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  opacity: 0.8;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.75rem;
  }
`;

const Divider = styled.span`
  color: ${props => props.theme.colors.border};
  font-size: 0.8rem;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    display: none;
  }
`;

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <FooterContainer>
      <FooterContent>
        <FooterLinks>
          <FooterLink to="/privacy-policy">
            Privacy Policy
          </FooterLink>
          <Divider>•</Divider>
          <ExternalLink 
            href="https://github.com/MarbleSodas/MitPlan" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            GitHub
          </ExternalLink>
          <Divider>•</Divider>
          <ExternalLink 
            href="https://ko-fi.com/marblesodas" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            Support Us
          </ExternalLink>
          <Divider>•</Divider>
          <ExternalLink
            href="https://discord.gg/QWvSaUC7zj"
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </ExternalLink>
        </FooterLinks>
        
        <Copyright>
          © {currentYear} MitPlan. Made for the FFXIV community.
          <br />
          Final Fantasy XIV is a trademark of Square Enix Holdings Co., Ltd.
        </Copyright>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;
