-- Universitet tuzilmasi guruhlari: Institutlar, Kafedralar, Markazlar
ALTER TYPE "DepartmentType" ADD VALUE IF NOT EXISTS 'INSTITUTE';
ALTER TYPE "DepartmentType" ADD VALUE IF NOT EXISTS 'CHAIR';
ALTER TYPE "DepartmentType" ADD VALUE IF NOT EXISTS 'CENTER';
