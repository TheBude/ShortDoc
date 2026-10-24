import { Department } from '@/types';

export interface DepartmentGroup<T> {
  key: string;
  label: string;
  items: T[];
}

// Universitet tuzilmasi guruhlari (tartib: ro'yxatda shu tartibda ko'rsatiladi)
const GROUP_DEFS: { key: string; label: string; types: string[] }[] = [
  { key: 'RECTORATE', label: 'Rahbariyat', types: ['RECTORATE'] },
  { key: 'INSTITUTE', label: 'Institutlar', types: ['INSTITUTE'] },
  { key: 'FACULTY', label: 'Fakultetlar', types: ['FACULTY'] },
  { key: 'CHAIR', label: 'Kafedralar', types: ['CHAIR'] },
  { key: 'DEPARTMENT', label: 'Boshqarma va bo‘limlar', types: ['DEPARTMENT', 'CHANCELLERY', 'DIVISION'] },
  { key: 'CENTER', label: 'Markazlar', types: ['CENTER'] },
];

export const DEPARTMENT_TYPE_LABELS: Record<string, string> = {
  RECTORATE: 'Rahbariyat',
  INSTITUTE: 'Institut',
  FACULTY: 'Fakultet',
  CHAIR: 'Kafedra',
  DEPARTMENT: 'Boshqarma / bo‘lim',
  CHANCELLERY: 'Devonxona',
  DIVISION: 'Boshqarma / bo‘lim',
  CENTER: 'Markaz',
};

export const getDepartmentGroupIndex = (type?: string | null): number => {
  const idx = GROUP_DEFS.findIndex((g) => g.types.includes(type || ''));
  return idx === -1 ? GROUP_DEFS.length - 1 : idx;
};

export const getDepartmentGroupLabel = (type?: string | null): string =>
  GROUP_DEFS[getDepartmentGroupIndex(type)].label;

/**
 * Bo'limlarni tuzilma guruhlari (Rahbariyat, Institutlar, Fakultetlar, Kafedralar, Boshqarma va bo'limlar, Markazlar) bo'yicha ajratadi.
 * Bo'sh guruhlar tushirib qoldiriladi.
 */
export function groupDepartments(departments: Department[]): DepartmentGroup<Department>[] {
  return GROUP_DEFS.map((g) => ({
    key: g.key,
    label: g.label,
    items: departments.filter((d) => g.types.includes(d.type)),
  })).filter((g) => g.items.length > 0);
}
