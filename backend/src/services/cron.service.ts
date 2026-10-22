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
      include: {
        document: { select: { id: true, regNumber: true, title: true } },
      },
    });

    for (const task of overdueTasks) {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'OVERDUE' },
      });

      const notifTitle = 'Topshiriq muddati o‘tib ketdi';
      const notifMessage = `"${task.title}" topshirig‘i ijro muddati o‘tib ketdi (${task.document.regNumber}).`;
      const notifLink = '/tasks';

      await prisma.notification.create({
        data: {
          userId: task.assignedToId,
          title: notifTitle,
          message: notifMessage,
          link: notifLink,
        },
      });

      realtime.sendToUser(task.assignedToId, 'NOTIFICATION', {
        title: notifTitle,
        message: notifMessage,
        link: notifLink,
      });

      realtime.sendToUser(task.assignedToId, 'COUNTS_UPDATE', {});
    }

    if (overdueTasks.length > 0) {
      console.log(`[Cron] ${overdueTasks.length} ta muddati o‘tgan topshiriq OVERDUE holatiga o‘tkazildi.`);
    }

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
