import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  FileEdit,
  Settings,
  LogOut,
  Link2,
  User
} from "lucide-react";

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

const NavLink = ({ href, icon, children, active }: NavLinkProps) => {
  return (
    <li className={cn(
      "px-4 py-3 hover:bg-gray-700 transition-colors",
      active && "bg-gray-700"
    )}>
      <Link href={href} className="flex items-center text-gray-300 hover:text-white">
        <span className="mr-3">{icon}</span>
        <span>{children}</span>
      </Link>
    </li>
  );
};

const Sidebar = () => {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  return (
    <aside className="w-64 bg-gray-800 text-white hidden md:block h-screen">
      <div className="p-4">
        <h1 className="text-xl font-semibold">EventFlow</h1>
        <p className="text-sm text-gray-400">Admin Dashboard</p>
      </div>
      
      <nav className="mt-6">
        <ul>
          <NavLink 
            href="/admin/dashboard" 
            icon={<LayoutDashboard size={18} />}
            active={location === "/admin/dashboard" || location === "/" || location === "/admin"}
          >
            Dashboard
          </NavLink>
          
          <NavLink 
            href="/admin/events" 
            icon={<Calendar size={18} />}
            active={location.startsWith("/admin/events")}
          >
            Events
          </NavLink>
          
          <NavLink 
            href="/admin/registrations" 
            icon={<ClipboardList size={18} />}
            active={location.startsWith("/admin/registrations")}
          >
            Registrations
          </NavLink>
          
          <NavLink 
            href="/admin/forms" 
            icon={<FileEdit size={18} />}
            active={location.startsWith("/admin/forms")}
          >
            Form Builder
          </NavLink>
          
          <NavLink 
            href="/admin/webhooks" 
            icon={<Link2 size={18} />}
            active={location.startsWith("/admin/webhooks")}
          >
            Zapier Webhooks
          </NavLink>

          <div className="mt-6 border-t border-gray-700 pt-4">
            <NavLink
              href="/admin/account"
              icon={<User size={18} />}
              active={location.startsWith("/admin/account")}
            >
              Account Settings
            </NavLink>
          </div>
        </ul>
      </nav>
      
      <div className="absolute bottom-0 w-full p-4 border-t border-gray-700">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {user?.username?.slice(0, 2).toUpperCase() || 'AD'}
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">
              {user?.username || 'Admin User'}
            </p>
            <p className="text-xs text-gray-400">
              {user?.email || 'No email available'}
            </p>
          </div>
        </div>
        <button 
          className="mt-3 text-sm text-gray-400 hover:text-white flex items-center w-full"
          onClick={async () => {
            await logout();
            window.location.href = '/login';
          }}
        >
          <LogOut size={16} className="mr-2" /> Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
