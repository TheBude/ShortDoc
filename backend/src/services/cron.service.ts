import { prisma } from '../prisma.js';
import { realtime } from './realtime.js';

let cronInterval: NodeJS.Timeout | null = null;

/**
 * Muddati o'tgan topshiriqlarni avtomatik OVERDUE qilish va mas'ulga bir marta bildirishnoma yuborish
 */
export async function checkOverdueTasks(): Promise<number> {
  try {
    const now = new Date();
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        deadline: { lt: now },
      },
      select: {
        id: true,
        title: true,
        assignedToId: true,
        document: { select: { regNumber: true } },
      },
    });

    if (overdueTasks.length === 0) return 0;

    const notifTitle = 'Topshiriq muddati o‘tib ketdi';
    const notifLink = '/tasks';
    const notifications = overdueTasks.map((task) => ({
      userId: task.assignedToId,
      title: notifTitle,
      message: `"${task.title}" topshirig‘i ijro muddati o‘tib ketdi (${task.document.regNumber}).`,
      link: notifLink,
    }));

    // Holat va bildirishnomalar bitta tranzaksiyada, har biri uchun alohida so'rovsiz (N+1 oldini olish)
    await prisma.$transaction([
      prisma.task.updateMany({
        where: { id: { in: overdueTasks.map((t) => t.id) }, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        data: { status: 'OVERDUE' },
      }),
      prisma.notification.createMany({ data: notifications }),
    ]);

    notifications.forEach((n) => {
      realtime.sendToUser(n.userId, 'NOTIFICATION', {
        title: n.title,
        message: n.message,
        link: n.link,
      });
      realtime.sendToUser(n.userId, 'COUNTS_UPDATE', {});
    });

    console.log(`[Cron] ${overdueTasks.length} ta muddati o‘tgan topshiriq OVERDUE holatiga o‘tkazildi.`);

    return overdueTasks.length;
  } catch (error) {
    console.error('[Cron Error] Topshiriqlar muddatini tekshirishda xatolik:', error);
    return 0;
  }
}

/**
 * Soatlik jobni ishga tushirish (har 1 soatda va server startida)
 */
export function startCronJobs() {
  // Server ishga tushishi bilan bir marta tekshirish
  checkOverdueTasks().catch(() => null);

  // Har 1 soatda (3600_000 ms) takrorlash
  cronInterval = setInterval(() => {
    checkOverdueTasks().catch(() => null);
  }, 60 * 60 * 1000);

  cronInterval.unref();
}

export function stopCronJobs() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
}
