import Footer from './Footer';


export const AppLayout = ({ children, hasBanner = false, hideFooter = false }) => (
  <div className={`w-full min-h-screen mx-auto p-6 ${hasBanner ? 'pt-[calc(80px+1.5rem)]' : 'pt-6'} box-border transition-[padding-top] duration-300 ease-in-out flex flex-col text-gray-900 dark:text-gray-100`}>
    <main className="flex-1">{children}</main>
    {!hideFooter && <Footer />}
  </div>
);

export default AppLayout;