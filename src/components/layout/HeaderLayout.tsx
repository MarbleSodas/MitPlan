import React from 'react';

export const HeaderLayout = ({ title, description, topLeftContent, topRightContent }) => {
  return (
    <header className="text-center flex flex-col relative mb-8">
      <div className="flex justify-between gap-2 py-4">
        {topLeftContent}
        {topRightContent}
      </div>
      <h1 className="text-4xl font-bold mb-2 text-foreground">{title}</h1>
      <p className="text-lg text-muted-foreground">{description}</p>
    </header>
  );
};

export default HeaderLayout;
