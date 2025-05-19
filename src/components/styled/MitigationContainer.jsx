import styled from 'styled-components';

const MitigationContainer = styled.div`
  flex: 1;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.large};
  padding: ${props => props.theme.spacing.large};
  box-shadow: ${props => props.theme.shadows.medium};
  overflow-y: auto;
  height: calc(100vh - 100px);
  min-height: 500px;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.responsive.medium};
    border-radius: ${props => props.theme.borderRadius.responsive.medium};
    height: calc(100vh - 90px);
    min-height: 450px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    display: none;
  }
`;

export default MitigationContainer;