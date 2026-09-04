import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { CalendarDays, MessageCircle, Users, LayoutDashboard } from "lucide-react";

export const metadata: Metadata = {
  title: "CareBook — Dwarka Clinic",
  description: "AI-powered appointment scheduling for Dwarka Clinic"
};

const navItems = [
  { href: "/", label: "AI Agent", icon: MessageCircle },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/patients", label: "Patients", icon: Users }
];

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen flex-col md:flex-row">
          <aside className="border-b md:border-b-0 md:border-r border-slate-200 bg-white md:w-56 md:min-h-screen">
            <div className="px-4 py-4 border-b border-slate-100">
              <p className="font-semibold text-clinic-700">CareBook</p>
              <p className="text-xs text-slate-500">Dwarka Clinic</p>
            </div>
            <nav className="flex md:flex-col overflow-x-auto md:overflow-visible">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-clinic-50 hover:text-clinic-700 whitespace-nowrap"
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
