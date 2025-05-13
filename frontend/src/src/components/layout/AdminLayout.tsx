import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import MobileSidebar from "./MobileSidebar";
import Header from "./Header";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <MobileSidebar />
      
      <main className="flex-1 md:ml-0">
        <div className="py-8 px-6 md:py-12 md:px-8 mt-16 md:mt-0">
          <Header title={title} />
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
