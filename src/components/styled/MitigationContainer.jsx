import styled from 'styled-components';

const MitigationContainer = styled.div`
  flex: 0 0 auto;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.large};
  padding: ${props => props.theme.spacing.medium};
  box-shadow: ${props => props.theme.shadows.medium};
  overflow-y: auto;
  height: calc(100vh - 100px);
  min-height: 500px;

`;

export default MitigationContainer;