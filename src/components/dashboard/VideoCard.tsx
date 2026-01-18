'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Play, 
  Clock, 
  Eye, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Share2, 
  Download,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Video } from '@/types';
import { formatDuration, formatDate } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface VideoCardProps {
  video: Video;
  variant?: 'default' | 'compact' | 'horizontal';
  showTeacher?: boolean;
  showActions?: boolean;
  onDelete?: (id: string) => void;
  onSave?: (id: string) => void;
  isSaved?: boolean;
}

const statusMap = {
  draft: { label: 'Taslak', color: 'bg-muted text-muted-foreground' },
  processing: { label: 'İşleniyor', color: 'bg-amber-500/10 text-amber-500' },
  published: { label: 'Yayında', color: 'bg-emerald-500/10 text-emerald-500' },
  failed: { label: 'Hata', color: 'bg-destructive/10 text-destructive' },
};

export function VideoCard({
  video,
  variant = 'default',
  showTeacher = false,
  showActions = true,
  onDelete,
  onSave,
  isSaved = false,
}: VideoCardProps) {
  const [imageError, setImageError] = useState(false);
  const status = statusMap[video.status];

  const linkHref = showActions 
    ? `/dashboard/teacher/videos/${video.id}`
    : `/dashboard/student/watch/${video.id}`;

  if (variant === 'horizontal') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group flex gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300"
      >
        {/* Thumbnail */}
        <Link href={linkHref} className="relative shrink-0 w-48 aspect-video rounded-lg overflow-hidden bg-muted">
          {!imageError ? (
            <Image
              src={video.thumbnailUrl}
              alt={video.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Play className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-medium">
            {formatDuration(video.duration)}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link href={linkHref}>
                <h3 className="font-semibold hover:text-primary transition-colors line-clamp-1">
                  {video.title}
                </h3>
              </Link>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {video.description}
              </p>
            </div>
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" />
                    Düzenle
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="w-4 h-4 mr-2" />
                    Paylaş
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    İndir
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete?.(video.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Sil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              {video.subject}
            </Badge>
            <span>{video.grade}. Sınıf</span>
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {video.viewCount}
            </div>
            <Badge className={cn('text-xs', status.color)}>
              {status.label}
            </Badge>
          </div>

          {showTeacher && (
            <div className="flex items-center gap-2 mt-3">
              <Avatar className="w-6 h-6">
                <AvatarImage src={video.teacherAvatar} />
                <AvatarFallback className="text-xs">
                  {video.teacherName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{video.teacherName}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      {/* Thumbnail */}
      <Link href={linkHref} className="relative block aspect-video bg-muted overflow-hidden">
        {!imageError ? (
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1, opacity: 1 }}
            className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
          </motion.div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-medium">
          {formatDuration(video.duration)}
        </div>

        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <Badge className={cn('text-xs', status.color)}>
            {status.label}
          </Badge>
        </div>

        {/* Save Button for Students */}
        {onSave && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onSave(video.id);
            }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
          >
            {isSaved ? (
              <BookmarkCheck className="w-4 h-4 text-primary" />
            ) : (
              <Bookmark className="w-4 h-4 text-white" />
            )}
          </button>
        )}
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={linkHref}>
            <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors">
              {video.title}
            </h3>
          </Link>
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 -mt-1 -mr-2">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Düzenle
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="w-4 h-4 mr-2" />
                  Paylaş
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  İndir
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete?.(video.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Sil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {video.subject}
          </Badge>
          <span>•</span>
          <span>{video.grade}. Sınıf</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {video.viewCount} izlenme
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(video.createdAt)}
          </div>
        </div>

        {/* Teacher */}
        {showTeacher && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <Avatar className="w-6 h-6">
              <AvatarImage src={video.teacherAvatar} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {video.teacherName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{video.teacherName}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
