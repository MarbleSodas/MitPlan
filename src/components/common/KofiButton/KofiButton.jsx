import React from 'react';
import styled from 'styled-components';

const KofiLink = styled.a`
  display: inline-block;
  transition: transform 0.2s ease;
  border-radius: 16px;
  height: 36px;
  overflow: hidden; // Ensures the border-radius applies to the image
  box-shadow: ${props => props.theme.shadows.small};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.medium};
  }

  &:active {
    transform: translateY(0);
  }

  img {
    display: block;
    height: 100%;
    width: auto;
    border: 0;
  }
`;

const KofiButton = () => {
  return (
    <KofiLink
      href="https://ko-fi.com/P5P1136OC5"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Support me on Ko-fi"
    >
      <img
        src="https://storage.ko-fi.com/cdn/kofi6.png?v=6"
        alt="Buy Me a Coffee at ko-fi.com"
      />
    </KofiLink>
  );
};

export default KofiButton;
