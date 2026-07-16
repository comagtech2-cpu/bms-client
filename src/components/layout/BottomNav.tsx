import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, MoreHorizontal } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/customers', icon: Users, label: 'Customers' },
];

interface BottomNavProps {
  onOpenSidebar: () => void;
}

export default function BottomNav({ onOpenSidebar }: BottomNavProps) {
  const location = useLocation();

  const isMoreActive = !navItems.some(
    (item) => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <item.icon size={20} />
          <span>{item.label}</span>
        </NavLink>
      ))}
      <button
        className={`mobile-nav-item ${isMoreActive ? 'active' : ''}`}
        onClick={onOpenSidebar}
        type="button"
      >
        <MoreHorizontal size={20} />
        <span>More</span>
      </button>
    </nav>
  );
}
