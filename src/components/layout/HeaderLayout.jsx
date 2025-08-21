import React from 'react';
import styled from 'styled-components';

const Header = styled.header`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.xlarge};
  display: flex;
  flex-direction: column;
  position: relative;


  h1 {
    font-size: ${props => props.theme.fontSizes.responsive.xxxlarge};


  }

  p {
    font-size: ${props => props.theme.fontSizes.responsive.medium};


  }
`;

const HeaderTop = styled.div`
  display: flex;
  gap: 8px;
  justify-content: space-between;
  padding: ${props => props.theme.spacing.medium} 0;


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