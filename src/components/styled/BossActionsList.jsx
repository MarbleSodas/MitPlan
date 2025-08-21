import styled from 'styled-components';

const BossActionsList = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${props => props.theme.spacing.medium};
  position: relative;
  width: 100%;
  margin: 0;
  flex-grow: 1;

`;

export default BossActionsList;