import React from 'react';

import { Link } from 'react-router-dom';


const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full pt-8 pb-4 mt-auto border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-900 text-gray-500 dark:text-gray-400 transition-colors">
      <div className="max-w-[1200px] mx-auto px-8 sm:px-4 flex flex-col items-center gap-4 sm:gap-3">
        <div className="flex flex-wrap items-center justify-center gap-8 sm:flex-col sm:gap-4">
          <Link to="/privacy-policy" className="text-[0.9rem] text-gray-500 hover:text-[#3399ff] hover:underline transition-colors">
            Privacy Policy
          </Link>
          <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
          <a
            href="https://github.com/MarbleSodas/MitPlan"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.9rem] text-gray-500 hover:text-[#3399ff] hover:underline transition-colors"
          >
            GitHub
          </a>
          <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
          <a
            href="https://ko-fi.com/marblesodas"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.9rem] text-gray-500 hover:text-[#3399ff] hover:underline transition-colors"
          >
            Support Us
          </a>
          <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
          <a
            href="https://discord.gg/QWvSaUC7zj"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.9rem] text-gray-500 hover:text-[#3399ff] hover:underline transition-colors"
          >
            Discord
          </a>
        </div>
        
        <div className="text-center text-xs text-gray-500/80">
          © {currentYear} MitPlan. Made for the FFXIV community.
          <br />
          Final Fantasy XIV is a trademark of Square Enix Holdings Co., Ltd.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
