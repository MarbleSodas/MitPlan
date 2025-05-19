import styled from 'styled-components';

const BossActionsList = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${props => props.theme.spacing.medium};
  position: relative;
  width: 100%;
  margin: 0;
  flex-grow: 1;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.small};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.small};
    overflow-y: auto;
    height: 100%;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
  }

  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.xsmall};
  }
`;

export default BossActionsList;