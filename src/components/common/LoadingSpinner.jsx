import React from 'react';





const LoadingSpinner = ({ text = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-neutral-950">
      <div className="h-12 w-12 border-4 border-gray-300 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin" />
      <p className="mt-4 text-gray-500 dark:text-gray-400 text-base">{text}</p>
    </div>
  );
};

export default LoadingSpinner;
