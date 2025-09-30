import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export const HeaderLayout = ({ title, description, topLeftContent, topRightContent }) => {
  const { theme } = useTheme();
  return (
    <header className="text-center flex flex-col relative mb-[var(--space-xlarge)]">
      <div className="flex justify-between gap-2 py-[var(--space-medium)]">
        {topLeftContent}
        {topRightContent}
      </div>
      <h1 className="text-[var(--fs-r-xxxlarge)]">{title}</h1>
      <p className="text-[var(--fs-r-medium)]">{description}</p>
    </header>
  );
};

export default HeaderLayout;