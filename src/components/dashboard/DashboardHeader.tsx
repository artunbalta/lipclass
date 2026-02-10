'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Bell,
  Menu,
  X,
  Moon,
  Sun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface DashboardHeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function DashboardHeader({ onMenuClick, showMenuButton = false }: DashboardHeaderProps) {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleDarkMode = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-6 bg-background/80 backdrop-blur-xl border-b border-border">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {/* Search */}
        <div className="hidden sm:flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Ara..."
              className="w-64 pl-9 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Mobile Search Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => setSearchOpen(!searchOpen)}
        >
          {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
        </Button>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Dark Mode Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Bildirimler</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-64 overflow-y-auto">
              <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer">
                <p className="text-sm font-medium">Yeni video hazır!</p>
                <p className="text-xs text-muted-foreground">
                  "Birinci Dereceden Denklemler" videosu oluşturuldu.
                </p>
                <span className="text-xs text-muted-foreground">2 saat önce</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer">
                <p className="text-sm font-medium">İzlenme rekoru!</p>
                <p className="text-xs text-muted-foreground">
                  Videonuz bu hafta 100+ kez izlendi.
                </p>
                <span className="text-xs text-muted-foreground">1 gün önce</span>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center text-primary cursor-pointer">
              Tümünü gör
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {user?.name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline-block text-sm font-medium">
                {user?.name?.split(' ')[0]}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profil</DropdownMenuItem>
            <DropdownMenuItem>Ayarlar</DropdownMenuItem>
            <DropdownMenuItem>Yardım</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Search Bar */}
      {searchOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 right-0 p-4 bg-background border-b border-border sm:hidden"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Video, konu veya öğretmen ara..."
              className="pl-9"
              autoFocus
            />
          </div>
        </motion.div>
      )}
    </header>
  );
}
