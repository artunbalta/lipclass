'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Video,
  Plus,
  UserCircle,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BookOpen,
  Bookmark,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/Logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/components/providers/language-provider';

interface SidebarProps {
  role: 'teacher' | 'student';
}

export function Sidebar({ role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { theme, resolvedTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default to light theme (dark logo) until mounted to prevent hydration mismatch
  const currentTheme = mounted ? resolvedTheme : 'light';

  const teacherNavItems = [
    { icon: Home, label: t('sidebar.home'), href: '/dashboard/teacher' },
    { icon: Video, label: t('sidebar.myVideos'), href: '/dashboard/teacher/videos' },
    { icon: Plus, label: t('sidebar.newVideo'), href: '/dashboard/teacher/create' },
    { icon: UserCircle, label: t('sidebar.referenceVideo'), href: '/dashboard/teacher/reference' },
    { icon: BarChart3, label: t('sidebar.analytics'), href: '/dashboard/teacher/analytics' },
    { icon: Settings, label: t('sidebar.settings'), href: '/dashboard/teacher/settings' },
  ];

  const studentNavItems = [
    { icon: Home, label: t('sidebar.home'), href: '/dashboard/student' },
    { icon: Search, label: t('sidebar.discover'), href: '/dashboard/student/browse' },
    { icon: BookOpen, label: t('sidebar.myCourses'), href: '/dashboard/student/courses' },
    { icon: Bookmark, label: t('sidebar.saved'), href: '/dashboard/student/saved' },
    { icon: Settings, label: t('sidebar.settings'), href: '/dashboard/student/settings' },
  ];

  const navItems = role === 'teacher' ? teacherNavItems : studentNavItems;

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-card border-r border-border"
    >
      {/* Header */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-border',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        <Logo
          size={collapsed ? "sm" : "md"}
          variant={currentTheme === 'dark' ? 'light' : 'dark'}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn('shrink-0', collapsed && 'absolute -right-3 bg-card border border-border rounded-full shadow-sm')}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard/teacher' &&
                item.href !== '/dashboard/student' &&
                pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative',
                    'hover:bg-muted',
                    isActive && 'bg-primary/10 text-primary',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon className={cn(
                    'w-5 h-5 shrink-0 relative z-10',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className={cn(
                          'text-sm font-medium whitespace-nowrap relative z-10 pointer-events-none',
                          isActive ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Quick Action for Teacher */}
        {role === 'teacher' && !collapsed && (
          <div className="mt-6 px-1">
            <Link href="/dashboard/teacher/create">
              <Button className="w-full gap-2" size="sm">
                <Plus className="w-4 h-4" />
                {t('sidebar.createVideo')}
              </Button>
            </Link>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className={cn(
        'border-t border-border p-4',
        collapsed && 'flex flex-col items-center'
      )}>
        <div className={cn(
          'flex items-center gap-3',
          collapsed && 'flex-col'
        )}>
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {user?.name?.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {role === 'teacher' && 'subject' in (user || {})
                    ? (user as { subject: string }).subject
                    : role === 'student' && 'grade' in (user || {})
                      ? (user as { grade: string }).grade
                      : ''}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={handleLogout}
          className={cn(
            'text-muted-foreground hover:text-destructive',
            collapsed ? 'mt-2' : 'w-full mt-3'
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">{t('sidebar.logout')}</span>}
        </Button>
      </div>
    </motion.aside>
  );
}

