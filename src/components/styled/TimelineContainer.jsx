import styled from 'styled-components';

const TimelineContainer = styled.div`
  flex: 0 0 auto;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.large};
  padding: ${props => props.theme.spacing.medium};
  padding-bottom: ${props => props.theme.spacing.large};
  box-shadow: ${props => props.theme.shadows.medium};
  overflow-y: auto;
  height: calc(100vh - 100px);
  min-height: 500px;
  display: flex;
  flex-direction: column;

`;

export default TimelineContainer;