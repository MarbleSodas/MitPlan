import React from 'react';




const QuizButton = () => {
  return (
    <a
      href="https://quiz.xivmitplan.com/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Take the FFXIV Mitigation Quiz"
      className="inline-flex h-9 items-center justify-center rounded-[16px] bg-[#333333] px-4 font-bold text-white shadow-sm transition-transform duration-200 ease-in-out hover:-translate-y-0.5 active:translate-y-0"
    >
      Quiz
    </a>
  );
};

export default QuizButton;
