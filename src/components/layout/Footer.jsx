import React from 'react';

import { Link } from 'react-router-dom';


const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full pt-8 pb-4 mt-auto border-t border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-textSecondary)] transition-colors">
      <div className="max-w-[1200px] mx-auto px-8 sm:px-4 flex flex-col items-center gap-4 sm:gap-3">
        <div className="w-full flex flex-col md:flex-row md:flex-wrap items-center justify-center md:justify-between gap-4 md:gap-6">
          <Link to="/privacy-policy" className="text-[0.9rem] text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] hover:underline transition-colors">
            Privacy Policy
          </Link>
          <span className="text-xs text-[var(--color-textSecondary)] opacity-50">•</span>
          <a
            href="https://github.com/MarbleSodas/MitPlan"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.9rem] text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] hover:underline transition-colors"
          >
            GitHub
          </a>
          <span className="text-xs text-[var(--color-textSecondary)] opacity-50">•</span>
          <a
            href="https://ko-fi.com/marblesodas"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.9rem] text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] hover:underline transition-colors"
          >
            Support Us
          </a>
          <span className="text-xs text-[var(--color-textSecondary)] opacity-50">•</span>
          <a
            href="https://discord.gg/QWvSaUC7zj"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.9rem] text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] hover:underline transition-colors"
          >
            Discord
          </a>
        </div>

        <div className="text-center text-xs text-[var(--color-textSecondary)] opacity-80">
          © {currentYear} MitPlan. Made for the FFXIV community.
          <br />
          Final Fantasy XIV is a trademark of Square Enix Holdings Co., Ltd.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
