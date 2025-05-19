import styled from 'styled-components';

const TimelineContainer = styled.div`
  flex: 3;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.large};
  padding: ${props => props.theme.spacing.large};
  padding-bottom: ${props => props.theme.spacing.xlarge};
  box-shadow: ${props => props.theme.shadows.medium};
  overflow-y: auto;
  height: calc(100vh - 100px);
  min-height: 500px;
  display: flex;
  flex-direction: column;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.medium};
    border-radius: ${props => props.theme.borderRadius.responsive.medium};
    height: calc(100vh - 90px);
    min-height: 450px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.responsive.small};
    border-radius: ${props => props.theme.borderRadius.responsive.small};
    height: calc(100vh - 80px);
    min-height: 400px;
    margin-bottom: ${props => props.theme.spacing.responsive.medium};
    flex: 1;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
  }

  @media (max-width: ${props => props.theme.breakpoints.smallMobile}) {
    padding: ${props => props.theme.spacing.xsmall};
    border-radius: ${props => props.theme.borderRadius.small};
    height: calc(100vh - 70px);
    min-height: 350px;
    margin-bottom: ${props => props.theme.spacing.small};
  }
`;

export default TimelineContainer;