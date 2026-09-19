"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, CalendarDays, Compass, LayoutDashboard, Menu, ScanLine, Store, Ticket, X } from 'lucide-react';
import { useState } from 'react';

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const attendeeItems: NavItem[] = [
  { label: 'Dashboard / Home', href: '/', icon: LayoutDashboard },
  { label: 'Browse Events', href: '/#events', icon: Compass },
  { label: 'My Tickets', href: '/dashboard', icon: Ticket },
  { label: 'Marketplace', href: '/marketplace', icon: Store },
];

const organizerItems: NavItem[] = [
  { label: 'Dashboard', href: '/organizer', icon: LayoutDashboard },
  { label: 'My Events', href: '/organizer/events', icon: CalendarDays },
  { label: 'Create Event', href: '/organizer/events/create', icon: CalendarDays },
  { label: 'Tickets', href: '/dashboard', icon: Ticket },
  { label: 'Scanner / Check-in', href: '/dashboard/scanner', icon: ScanLine },
  { label: 'Analytics', href: '/organizer/analytics', icon: BarChart3 },
];

function isActive(pathname: string, href: string) {
  if (href === '/' || href === '/#events') return pathname === '/';
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate: () => void }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/30' : 'text-gray-300 hover:bg-white/10 hover:text-white'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const organizerSection = pathname.startsWith('/organizer') || pathname === '/dashboard/scanner';

  return (
    <>
      <div className="hidden border-t border-white/10 bg-black/20 lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 overflow-x-auto px-6 py-2">
          <nav className="flex items-center gap-1" aria-label="Primary navigation">
            {(organizerSection ? organizerItems : attendeeItems).map((item) => (
              <NavLink key={item.href + item.label} item={item} pathname={pathname} onNavigate={() => undefined} />
            ))}
          </nav>
          <Link
            href={organizerSection ? '/dashboard' : '/organizer'}
            className="shrink-0 text-sm font-medium text-cyan-300 hover:text-white"
          >
            {organizerSection ? 'Attendee View' : 'Organizer Dashboard'}
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/20 px-6 py-2 lg:hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-gray-500">{organizerSection ? 'Organizer' : 'Attendee'}</span>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileOpen && (
          <nav className="grid gap-1 pb-2 pt-2" aria-label="Mobile navigation">
            {(organizerSection ? organizerItems : attendeeItems).map((item) => (
              <NavLink key={item.href + item.label} item={item} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            ))}
            <Link
              href={organizerSection ? '/dashboard' : '/organizer'}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-cyan-300 hover:bg-white/10 hover:text-white"
            >
              {organizerSection ? 'Attendee View' : 'Organizer Dashboard'}
            </Link>
          </nav>
        )}
      </div>
    </>
  );
}