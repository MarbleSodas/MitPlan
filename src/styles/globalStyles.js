import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  body {
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    margin: 0;
    padding: 0;
    font-family: 'Arial', sans-serif;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  * {
    box-sizing: border-box;
  }

  h1, h2, h3, h4, h5, h6 {
    margin-top: 0;
    color: ${props => props.theme.colors.text};
  }

  h1 {
    font-size: ${props => props.theme.fontSizes.xxlarge};
    margin-bottom: ${props => props.theme.spacing.large};
  }

  h2 {
    font-size: ${props => props.theme.fontSizes.xlarge};
    margin-bottom: ${props => props.theme.spacing.medium};
  }

  h3 {
    font-size: ${props => props.theme.fontSizes.large};
    margin-bottom: ${props => props.theme.spacing.small};
  }

  p {
    margin: 0 0 ${props => props.theme.spacing.medium} 0;
  }

  a {
    color: ${props => props.theme.colors.primary};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  button {
    cursor: pointer;
  }

  /* Accessibility */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${props => props.theme.mode === 'dark' ? '#2d2d2d' : '#f1f1f1'};
  }

  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.mode === 'dark' ? '#555' : '#ccc'};
    border-radius: 4px;
  }

  /* Special handling for browser inspect mode */
  @media (max-width: 768px) {
    html, body {
      height: 100%;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }

    /* Force hardware acceleration for smoother scrolling */
    * {
      -webkit-transform: translateZ(0);
      -moz-transform: translateZ(0);
      -ms-transform: translateZ(0);
      -o-transform: translateZ(0);
      transform: translateZ(0);
    }
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.mode === 'dark' ? '#777' : '#aaa'};
  }
`;

export default GlobalStyles;
