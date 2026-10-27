import { User } from '@/types';

export const UNIVERSITY_NAME = 'Sharof Rashidov nomidagi Samarqand davlat universiteti';

/** "Sh", "Ch" digrafi bitta harf: "Shuhrat" -> "Sh.", "Akbar" -> "A." */
function nameInitial(word?: string): string {
  const w = (word || '').trim();
  if (!w) return '';
  const two = w.slice(0, 2).toLowerCase();
  const head = two === 'sh' || two === 'ch' ? w.slice(0, 2) : w[0];
  return `${head[0].toUpperCase()}${head.slice(1).toLowerCase()}.`;
}

/** "Fayzullayev Shuhrat Shuhrat o‘g‘li" -> "Sh.Sh.Fayzullayev" */
export function formatInitialsName(fullName?: string | null): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  const [lastName, firstName, patronymic] = parts;
  return `${nameInitial(firstName)}${nameInitial(patronymic)}${lastName}`;
}

/** Hujjat shapkasidagi "Kimdan": "<bo‘lim> <lavozim> <Sh.Sh.Familiya>" (oxiriga "tomonidan" backend qo‘shadi) */
export function composeSender(user?: Pick<User, 'fullName' | 'position' | 'department'> | null): string {
  if (!user) return '';
  return [user.department?.name, user.position, formatInitialsName(user.fullName)].filter(Boolean).join(' ');
}

/** Hujjat shapkasidagi "Kimga": "<universitet> <bo‘lim> <lavozim> <Sh.Sh.Familiya>ga" */
export function composeReceiver(user?: Pick<User, 'fullName' | 'position' | 'department'> | null): string {
  if (!user) return '';
  return `${UNIVERSITY_NAME} ${composeSender(user)}ga`;
}
