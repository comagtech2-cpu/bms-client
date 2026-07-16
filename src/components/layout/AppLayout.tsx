import { useState, useCallback, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const deltaX = e.touches[0].clientX - touchStartX.current;
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);

      if (Math.abs(deltaX) > 10 && deltaY < Math.abs(deltaX)) {
        isSwiping.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwiping.current) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;

      if (deltaX > 60 && touchStartX.current < 30) {
        setSidebarOpen(true);
      } else if (deltaX < -60 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [sidebarOpen]);

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={closeSidebar} />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="main-content">
        <Topbar onToggleSidebar={toggleSidebar} />
        <div className="page-content">
          <Outlet />
        </div>
        <BottomNav onOpenSidebar={toggleSidebar} />
      </div>
    </div>
  );
}
