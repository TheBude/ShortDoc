import ExcelJS from 'exceljs';

interface DocumentExportItem {
  regNumber: string;
  title: string;
  documentType: string;
  category: string;
  status: string;
  priority: string;
  departmentName: string;
  responsiblePerson: string;
  createdAt: Date;
  deadline: Date | null;
}

interface DepartmentStatItem {
  name: string;
  code: string;
  usersCount: number;
  documentsCount: number;
}

export async function generateReportsExcel(
  documents: DocumentExportItem[],
  departmentsStat: DepartmentStatItem[] = [],
  generatedBy: string = 'Tizim foydalanuvchisi'
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SamDU ShortDoc';
  workbook.lastModifiedBy = generatedBy;
  workbook.created = new Date();
  workbook.modified = new Date();

  // Helper functions for clean Uzbek labels
  const formatType = (type: string) => {
    switch (type) {
      case 'INCOMING': return 'Kiruvchi xat';
      case 'OUTGOING': return 'Chiquvchi xat';
      case 'INTERNAL': return 'Ichki hujjat';
      default: return type || 'Ichki hujjat';
    }
  };

  const formatStatus = (st: string) => {
    switch (st) {
      case 'REGISTERED': return 'Ro‘yxatga olingan';
      case 'IN_APPROVAL': return 'Kelishuvda (Imzo)';
      case 'IN_EXECUTION': return 'Ijroda';
      case 'COMPLETED': return 'Bajarildi';
      case 'REJECTED': return 'Qaytarildi';
      case 'ARCHIVED': return 'Arxivlangan';
      default: return st || 'Yangi';
    }
  };

  const formatPriority = (p: string) => {
    switch (p) {
      case 'URGENT': return 'Shoshilinch';
      case 'HIGH': return 'Yuqori';
      case 'MEDIUM': return 'O‘rta';
      case 'LOW': return 'Past';
      default: return p || 'Oddiy';
    }
  };

  const formatCategory = (cat: string) => {
    if (!cat) return 'Xizmat hujjati';
    const upper = cat.toUpperCase().trim();
    switch (upper) {
      case 'ORDER': return 'Buyruq';
      case 'DECISION': return 'Qaror';
      case 'DIRECTIVE': return 'Farmoyish';
      case 'BILDIRGI': return 'Bildirgi';
      case 'OFFICIAL_NOTE': return 'Xizmat xati';
      case 'APPLICATION': return 'Ariza';
      case 'APPEAL': return 'Murojaat';
      case 'LETTER': return 'Xat';
      case 'CONTRACT': return 'Shartnoma';
      case 'REPORT': return 'Hisobot';
      case 'ARCHIVE': return 'Arxiv';
      case 'OTHER': return 'Boshqa';
      default:
        if (upper.includes('BUYRU')) return 'Buyruq';
        if (upper.includes('QAROR')) return 'Qaror';
        if (upper.includes('FARMOYISH')) return 'Farmoyish';
        if (upper.includes('BILDIR')) return 'Bildirgi';
        if (upper.includes('XIZMAT')) return 'Xizmat xati';
        if (upper.includes('ARIZA')) return 'Ariza';
        if (upper.includes('MUROJAAT')) return 'Murojaat';
        if (upper.includes('HISOBOT')) return 'Hisobot';
        if (upper.includes('SHARTNOMA')) return 'Shartnoma';
        if (upper.includes('ARXIV')) return 'Arxiv';
        if (upper.includes('XAT')) return 'Xat';
        return cat;
    }
  };

  // ----------------------------------------------------------------------
  // SHEET 1: Hujjatlar Reyestri
  // ----------------------------------------------------------------------
  const sheet = workbook.addWorksheet('Hujjatlar Hisoboti', {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // Title Banner Rows
  sheet.mergeCells('A1:K1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'SHAROF RASHIDOV NOMIDAGI SAMARQAND DAVLAT UNIVERSITETI';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate 900
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:K2');
  const subTitleCell = sheet.getCell('A2');
  subTitleCell.value = 'SamDU ShortDoc — Universitet elektron hujjatlar va ijro intizomi tahliliy hisoboti';
  subTitleCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 22;

  sheet.mergeCells('A3:K3');
  const metaCell = sheet.getCell('A3');
  metaCell.value = `Shakllantirilgan vaqt: ${new Date().toLocaleDateString('uz-UZ')} ${new Date().toLocaleTimeString('uz-UZ')} | Eksport qildi: ${generatedBy} | Jami hujjatlar: ${documents.length} ta`;
  metaCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(3).height = 18;

  // Empty separator
  sheet.getRow(4).height = 8;

  // Table Headers
  const headers = [
    '№',
    'Hujjat raqami',
    'Hujjat sarlavhasi / Mazmuni',
    'Turi',
    'Kategoriya',
    'Holati',
    'Muhimlik',
    'Tegishli bo‘lim / Fakultet',
    'Mas’ul shaxs / Muallif',
    'Yaratilgan sana',
    'Ijro muddati',
  ];

  const headerRow = sheet.getRow(5);
  headerRow.values = headers;
  headerRow.height = 26;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Royal Blue
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  // Column Widths
  sheet.columns = [
    { key: 'num', width: 6 },
    { key: 'regNumber', width: 18 },
    { key: 'title', width: 44 },
    { key: 'type', width: 16 },
    { key: 'category', width: 18 },
    { key: 'status', width: 20 },
    { key: 'priority', width: 15 },
    { key: 'department', width: 32 },
    { key: 'responsible', width: 26 },
    { key: 'createdAt', width: 15 },
    { key: 'deadline', width: 15 },
  ];

  // Data Rows
  documents.forEach((doc, idx) => {
    const rowNum = idx + 6;
    const row = sheet.getRow(rowNum);

    const isEven = idx % 2 === 1;
    const bgColor = isEven ? 'FFF8FAFC' : 'FFFFFFFF'; // Zebra striping

    const formattedDate = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('uz-UZ') : '—';
    const formattedDeadline = doc.deadline ? new Date(doc.deadline).toLocaleDateString('uz-UZ') : 'Belgilanmagan';

    row.values = [
      idx + 1,
      doc.regNumber,
      doc.title,
      formatType(doc.documentType),
      formatCategory(doc.category),
      formatStatus(doc.status),
      formatPriority(doc.priority),
      doc.departmentName || 'Noma’lum',
      doc.responsiblePerson || '—',
      formattedDate,
      formattedDeadline,
    ];

    row.height = 24;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 9.5 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Alignment per column
      if (colNumber === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1E40AF' } };
      } else if (colNumber === 3) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      } else if (colNumber === 4 || colNumber === 5) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 6) {
        // Status column with soft badge background
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (doc.status === 'COMPLETED') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Emerald 100
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF166534' } }; // Emerald 800
        } else if (doc.status === 'IN_APPROVAL') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Amber 100
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF92400E' } }; // Amber 800
        } else if (doc.status === 'IN_EXECUTION') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // Blue 100
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1E40AF' } }; // Blue 800
        } else if (doc.status === 'REJECTED') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Rose 100
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF991B1B' } }; // Rose 800
        }
      } else if (colNumber === 7) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (doc.priority === 'URGENT') {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
        }
      } else if (colNumber === 8 || colNumber === 9) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
  });

  // ----------------------------------------------------------------------
  // SHEET 2: Bo‘limlar Statistikasi
  // ----------------------------------------------------------------------
  if (departmentsStat && departmentsStat.length > 0) {
    const depSheet = workbook.addWorksheet('Bo‘limlar Statistikasi', {
      views: [{ showGridLines: true }],
    });

    depSheet.mergeCells('A1:E1');
    const depTitle = depSheet.getCell('A1');
    depTitle.value = 'SAMDU FAKULTET VA BO‘LIMLAR BO‘YICHA HUJJATLAR TAQSIMOTI';
    depTitle.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    depTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    depTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    depSheet.getRow(1).height = 26;

    const depHeaders = ['№', 'Tashkiliy bo‘lim nomi', 'Qisqa kodi', 'Xodimlar soni', 'Hujjatlar soni'];
    const depHeaderRow = depSheet.getRow(3);
    depHeaderRow.values = depHeaders;
    depHeaderRow.height = 24;

    depHeaderRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    depSheet.columns = [
      { key: 'num', width: 6 },
      { key: 'name', width: 40 },
      { key: 'code', width: 16 },
      { key: 'users', width: 18 },
      { key: 'docs', width: 18 },
    ];

    departmentsStat.forEach((dep, idx) => {
      const r = depSheet.getRow(idx + 4);
      r.values = [idx + 1, dep.name, dep.code, `${dep.usersCount || 0} nafar`, `${dep.documentsCount || 0} ta`];
      r.height = 22;
      r.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: 9.5 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        cell.alignment = colNum === 2 ? { horizontal: 'left', vertical: 'middle' } : { horizontal: 'center', vertical: 'middle' };
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
