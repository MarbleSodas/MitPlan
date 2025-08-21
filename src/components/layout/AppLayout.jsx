import React from 'react';
import styled from 'styled-components';
import Footer from './Footer';

const AppContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.large};
  padding-top: ${props => props.$hasBanner ? 'calc(80px + ' + props.theme.spacing.large + ')' : props.theme.spacing.large};
  font-family: 'Arial', sans-serif;
  color: ${props => props.theme.colors.text};
  box-sizing: border-box;
  transition: padding-top 0.3s ease;
  display: flex;
  flex-direction: column;

`;

const MainContent = styled.div`
  flex: 1;
`;

export const AppLayout = ({ children, hasBanner = false }) => (
  <AppContainer $hasBanner={hasBanner}>
    <MainContent>{children}</MainContent>
    <Footer />
  </AppContainer>
);

export default AppLayout;