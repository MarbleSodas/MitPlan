import styled from 'styled-components';

const MainContent = styled.main`
  display: flex;
  gap: ${props => props.theme.spacing.medium};
  width: 100%;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    gap: ${props => props.theme.spacing.responsive.medium};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    gap: ${props => props.theme.spacing.responsive.small};
  }
`;

export default MainContent;