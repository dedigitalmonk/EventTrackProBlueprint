import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  FileEdit,
  Settings,
  LogOut,
  Menu,
  X,
  Link2
} from "lucide-react";

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

const NavLink = ({ href, icon, children, active, onClick }: NavLinkProps) => {
  return (
    <li className={cn(
      "px-4 py-3 hover:bg-gray-700 rounded mb-1 transition-colors",
      active && "bg-gray-700"
    )}>
      <Link 
        href={href} 
        className="flex items-center text-gray-300 hover:text-white"
        onClick={onClick}
      >
        <span className="mr-3">{icon}</span>
        <span>{children}</span>
      </Link>
    </li>
  );
};

const MobileSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);
  
  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden w-full bg-white border-b border-gray-200 fixed top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <button 
              onClick={toggleMenu} 
              className="text-gray-600 mr-4"
              aria-label="Toggle menu"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold">EventFlow</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-sm font-semibold">AD</span>
          </div>
        </div>
      </div>
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-gray-900 bg-opacity-50 z-20 md:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeMenu}
      >
        {/* Mobile Sidebar Content */}
        <div 
          className="w-64 h-full bg-gray-800 text-white p-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-semibold">EventFlow</h1>
            <button 
              onClick={closeMenu}
              className="text-white"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>
          
          <nav>
            <ul>
              <NavLink 
                href="/admin/dashboard" 
                icon={<LayoutDashboard size={18} />}
                active={location === "/admin/dashboard" || location === "/" || location === "/admin"}
                onClick={closeMenu}
              >
                Dashboard
              </NavLink>
              
              <NavLink 
                href="/admin/events" 
                icon={<Calendar size={18} />}
                active={location.startsWith("/admin/events")}
                onClick={closeMenu}
              >
                Events
              </NavLink>
              
              <NavLink 
                href="/admin/registrations" 
                icon={<ClipboardList size={18} />}
                active={location.startsWith("/admin/registrations")}
                onClick={closeMenu}
              >
                Registrations
              </NavLink>
              
              <NavLink 
                href="/admin/forms" 
                icon={<FileEdit size={18} />}
                active={location.startsWith("/admin/forms")}
                onClick={closeMenu}
              >
                Form Builder
              </NavLink>
              
              <NavLink 
                href="/admin/webhooks" 
                icon={<Link2 size={18} />}
                active={location.startsWith("/admin/webhooks")}
                onClick={closeMenu}
              >
                Zapier Webhooks
              </NavLink>
              

            </ul>
          </nav>
          
          <div className="absolute bottom-0 left-0 w-full p-4 border-t border-gray-700">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white text-sm font-semibold">AD</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-gray-400">admin@eventflow.com</p>
              </div>
            </div>
            <button className="mt-3 text-sm text-gray-400 hover:text-white flex items-center">
              <LogOut size={16} className="mr-2" /> Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;
