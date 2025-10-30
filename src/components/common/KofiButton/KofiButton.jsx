import React from 'react';




const KofiButton = () => {
  return (
    <a
      href="https://ko-fi.com/goodfaithgames"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Support me on Ko-fi"
      className="inline-block h-9 rounded-[16px] overflow-hidden shadow-sm transition-transform duration-200 ease-in-out hover:-translate-y-0.5 active:translate-y-0"
    >
      <img
        src="https://storage.ko-fi.com/cdn/kofi6.png?v=6"
        alt="Buy Me a Coffee at ko-fi.com"
        className="block h-full w-auto border-0"
      />
    </a>
  );
};

export default KofiButton;
