import React from 'react';
import styled from 'styled-components';

const Header = styled.header`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.xlarge};
  display: flex;
  flex-direction: column;
  position: relative;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    margin-bottom: ${props => props.theme.spacing.large};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    margin-bottom: ${props => props.theme.spacing.medium};
  }

  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    margin-bottom: ${props => props.theme.spacing.small};
  }

  h1 {
    font-size: ${props => props.theme.fontSizes.responsive.xxxlarge};

    @media (max-width: ${props => props.theme.breakpoints.tablet}) {
      font-size: ${props => props.theme.fontSizes.responsive.xxlarge};
      margin-bottom: ${props => props.theme.spacing.medium};
    }

    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      font-size: ${props => props.theme.fontSizes.responsive.xlarge};
      margin-bottom: ${props => props.theme.spacing.small};
    }

    @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
      font-size: ${props => props.theme.fontSizes.responsive.large};
      margin-bottom: ${props => props.theme.spacing.small};
    }
  }

  p {
    font-size: ${props => props.theme.fontSizes.responsive.medium};

    @media (max-width: ${props => props.theme.breakpoints.tablet}) {
      font-size: ${props => props.theme.fontSizes.responsive.medium};
    }

    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      font-size: ${props => props.theme.fontSizes.responsive.small};
    }

    @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
      font-size: ${props => props.theme.fontSizes.responsive.small};
      display: none; /* Hide on very small screens to save space */
    }
  }
`;

const HeaderTop = styled.div`
  display: flex;
  gap: 8px;
  justify-content: space-between;
  padding: ${props => props.theme.spacing.medium} 0;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.small} 0;
    gap: 8px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.xsmall} 0;
    gap: 6px;
  }

  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.xsmall} 0;
    gap: 4px;
  }
`;

export const HeaderLayout = ({ title, description, topLeftContent, topRightContent }) => (
  <Header>
    <HeaderTop>
      {topLeftContent}
      {topRightContent}
    </HeaderTop>
    <h1>{title}</h1>
    <p>{description}</p>
  </Header>
);

export default HeaderLayout;