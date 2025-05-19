import React from 'react';
import styled from 'styled-components';

const AppContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.large};
  font-family: 'Arial', sans-serif;
  color: ${props => props.theme.colors.text};
  box-sizing: border-box;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.medium};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.small};
  }

  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.xsmall};
  }
`;

export const AppLayout = ({ children }) => (
  <AppContainer>{children}</AppContainer>
);

export default AppLayout;