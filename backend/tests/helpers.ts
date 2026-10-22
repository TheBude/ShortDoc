import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateToken } from '../src/utils/jwt.js';

export interface TestUserContext {
  id: string;
  email: string;
  role: string;
  fullName: string;
  token: string;
  tokenVersion: number;
  departmentId?: string | null;
}

export const testUsers: Record<string, TestUserContext> = {};

export async function setupTestUsers() {
  const passwordHash = await bcrypt.hash('TestPass123!', 10);

  // 1. Department
  let dep = await prisma.department.findFirst({ where: { code: 'TEST_DEP' } });
  if (!dep) {
    dep = await prisma.department.create({
      data: {
        code: 'TEST_DEP',
        name: 'Sinov Bo‘limi',
        type: 'DEPARTMENT',
      },
    });
  }

  // 2. Users configuration
  const usersToCreate = [
    { key: 'admin', email: 'test_admin@shortdoc.uz', role: 'SUPER_ADMIN' as const, name: 'Test Super Admin', active: true },
    { key: 'rector', email: 'test_rector@shortdoc.uz', role: 'LEADERSHIP' as const, name: 'Test Rektor', active: true },
    { key: 'chancellery', email: 'test_chancellery@shortdoc.uz', role: 'CHANCELLERY' as const, name: 'Test Devonxona', active: true },
    { key: 'head', email: 'test_head@shortdoc.uz', role: 'DEPARTMENT_HEAD' as const, name: 'Test Bo‘lim Boshlig‘i', active: true },
    { key: 'staff1', email: 'test_staff1@shortdoc.uz', role: 'STAFF' as const, name: 'Test Xodim 1', active: true },
    { key: 'staff2', email: 'test_staff2@shortdoc.uz', role: 'STAFF' as const, name: 'Test Xodim 2', active: true },
    { key: 'inactiveStaff', email: 'test_inactive@shortdoc.uz', role: 'STAFF' as const, name: 'Test Faol Emas Xodim', active: false },
  ];

  for (const u of usersToCreate) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        role: u.role,
        fullName: u.name,
        isActive: u.active,
        departmentId: dep.id,
      },
      create: {
        email: u.email,
        passwordHash,
        fullName: u.name,
        role: u.role,
        position: 'Sinov Lavozimi',
        isActive: u.active,
        departmentId: dep.id,
        tokenVersion: 1,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
      departmentId: user.departmentId,
    });

    testUsers[u.key] = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      token,
      tokenVersion: user.tokenVersion,
      departmentId: user.departmentId,
    };
  }

  return testUsers;
}

export { app, request, prisma };
