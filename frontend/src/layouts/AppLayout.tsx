import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';

export const AppLayout: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreateGist = () => {
    navigate('/gists/new');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Desktop Persistent Sidebar */}
      <Sidebar
        className="hidden lg:flex"
        onCreateGistClick={handleCreateGist}
      />

      {/* Mobile Drawer */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onCreateGistClick={handleCreateGist}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMobileMenuOpen={() => setMobileNavOpen(true)}
          onCreateGistClick={handleCreateGist}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ openCreateGistModal: handleCreateGist }} />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
