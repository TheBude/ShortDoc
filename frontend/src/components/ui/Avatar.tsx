import React from 'react';
import { User as UserIcon } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
}

/** Profil rasmi; rasm yo‘q bo‘lsa ismning birinchi harfi ko‘rsatiladi. */
export const Avatar: React.FC<AvatarProps> = ({ src, name, className = '' }) => (
  <div
    className={`rounded-full overflow-hidden flex items-center justify-center shrink-0 font-bold ${className}`}
  >
    {src ? (
      <img src={src} alt={name || 'Profil rasmi'} className="w-full h-full object-cover" />
    ) : (
      name?.charAt(0) || <UserIcon className="w-4 h-4" />
    )}
  </div>
);
