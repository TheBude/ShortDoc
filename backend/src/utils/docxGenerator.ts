import QRCode from 'qrcode';
import { config } from '../config.js';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  ImageRun,
  Footer,
} from 'docx';

interface ApproverInfo {
  approver: {
    fullName: string;
    position?: string | null;
  };
  status: string;
  role?: string | null;
  signedAt?: Date | null;
}

interface DocumentDataForDocx {
  id: string;
  regNumber: string;
  title: string;
  documentType: string;
  category?: string | null;
  sender?: string | null;
  receiver?: string | null;
  summary?: string | null;
  withoutQr?: boolean;
  showApprovalList?: boolean;
  createdAt: Date;
  department?: {
    name: string;
  } | null;
  creator?: {
    fullName: string;
    position?: string | null;
  } | null;
  approvals?: ApproverInfo[];
}

/**
 * O'zbek ismining bosh harfi: "Sh", "Ch" digrafi bitta harf sanaladi.
 * "Shuhrat" -> "Sh.", "Akbar" -> "A."
 */
function nameInitial(word?: string): string {
  if (!word) return '';
  const w = word.trim();
  if (!w) return '';
  const two = w.slice(0, 2).toLowerCase();
  const head = two === 'sh' || two === 'ch' ? w.slice(0, 2) : w[0];
  return `${head[0].toUpperCase()}${head.slice(1).toLowerCase()}.`;
}

/**
 * "Fayzullayev Shuhrat Shuhrat o'g'li" -> "Sh.Sh.Fayzullayev" (ism va otasining ismi bosh harflari, familiya)
 */
function formatInitialsName(fullName?: string | null): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const [lastName, firstName, patronymic] = parts;
  return `${nameInitial(firstName)}${nameInitial(patronymic)}${lastName}`;
}

/**
 * Format date: "29.09.2026"
 */
function formatDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/** Hujjat turi sarlavhasi (bosh harflarda, nuqtasiz): "BILDIRISH", "ARIZA", ... */
function resolveTitle(category?: string | null): string {
  const cat = (category || '').toUpperCase();
  const map: Array<[string[], string]> = [
    [['ARIZA', 'APPLICATION'], 'ARIZA'],
    [['XIZMAT', 'OFFICIAL_NOTE'], 'XIZMAT XATI'],
    [['BUYRU', 'ORDER'], 'BUYRUQ'],
    [['QAROR', 'DECISION'], 'QAROR'],
    [['FARMOYISH', 'DIRECTIVE'], 'FARMOYISH'],
    [['MUROJAAT', 'APPEAL'], 'MUROJAAT'],
    [['HISOBOT', 'REPORT'], 'HISOBOT'],
    [['SHARTNOMA', 'CONTRACT'], 'SHARTNOMA'],
    [['ARXIV', 'ARCHIVE'], 'ARXIV HUJJATI'],
    [['XAT', 'LETTER'], 'RASMIY XAT'],
    [['BILDIR'], 'BILDIRISH'],
  ];
  for (const [keys, title] of map) {
    if (keys.some((k) => cat.includes(k))) return title;
  }
  return category ? category.replace(/\.$/, '').toUpperCase() : 'BILDIRISH';
}

export async function generateDocumentDocx(
  docData: DocumentDataForDocx,
  verifyBaseUrl: string = config.APP_URL
): Promise<Buffer> {
  const FONT = 'Times New Roman';
  const TEXT_COLOR = '000000';
  const SIZE = 28; // 14 pt

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  // Katak chegaralari
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
  // Jadval chegaralari: ichki (katak orasidagi) chiziqlar ham o'chirilishi shart,
  // aks holda Word ularni standart bo'yicha ko'rsatib qo'yadi
  const noTableBorders = {
    ...noBorders,
    insideHorizontal: noBorder,
    insideVertical: noBorder,
  };

  const run = (text: string, opts: { bold?: boolean; size?: number; italics?: boolean } = {}) =>
    new TextRun({ text, font: FONT, size: opts.size ?? SIZE, bold: opts.bold, italics: opts.italics, color: TEXT_COLOR });

  // Shapka: kimga (yuqori o'ng burchak). Qatorlar katak kengligiga qarab o'zi o'raladi
  const defaultReceiver =
    'Sharof Rashidov nomidagi\nSamarqand davlat universiteti\nrektori prof. R.I. Xalmuradovga';
  const receiverText = (docData.receiver?.trim() || defaultReceiver).split(/\s*\n\s*/).join(' ');

  // Shapka: kimdan
  const initialsName = formatInitialsName(docData.creator?.fullName) || 'Xodim';
  const depName = docData.department?.name || 'Raqamli ta\'lim texnologiyalari markazi';
  const position = docData.creator?.position || 'xodimi';
  const signerPosition = `${depName} ${position}`;

  let senderText = docData.sender?.trim();
  if (!senderText) {
    senderText = `${signerPosition} ${initialsName} tomonidan`;
  } else if (!/tomonidan\.?$/.test(senderText)) {
    senderText = `${senderText} tomonidan`;
  }
  senderText = senderText.replace(/\.$/, '');

  const titleText = resolveTitle(docData.category);

  // Asosiy matn: har bir qator alohida abzats
  const bodyRaw =
    docData.summary?.trim() ||
    docData.title?.trim() ||
    'Men 2026-yil 29-sentabrdan kasallikdan so\'ng ishga chiqqanligimi ma\'lum qilaman.';
  const bodyParagraphs = bodyRaw
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean);

  // QR-kod: tekshirish sahifasiga olib boradi
  const verifyUrl = `${verifyBaseUrl.replace(/\/+$/, '')}/verify/${docData.id}`;
  const qrBuffer = docData.withoutQr
    ? null
    : await QRCode.toBuffer(verifyUrl, {
    type: 'png',
    width: 200,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  // Imzolaganlar ro'yxati: "Lavozim F.I.Sh. imzoladi (sana)". Kelishuvchilar va imzolovchilar alohida bloklarda
  const signedApprovals =
    docData.showApprovalList === false ? [] : (docData.approvals || []).filter((a) => a.status === 'APPROVED');
  const buildApprovalBlock = (heading: string, list: ApproverInfo[]): Paragraph[] =>
    list.length === 0
      ? []
      : [
          new Paragraph({
            spacing: { before: 500, after: 100 },
            children: [run(heading, { bold: true, size: 24 })],
          }),
          ...list.map(
            (a) =>
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  run(
                    `${a.approver.position ? a.approver.position + ' ' : ''}${a.approver.fullName} imzoladi${
                      a.signedAt ? ` (${formatDate(a.signedAt)})` : ''
                    }`,
                    { size: 22 }
                  ),
                ],
              })
          ),
        ];
  const approvalParagraphs: Paragraph[] = [
    ...buildApprovalBlock('Kelishildi:', signedApprovals.filter((a) => a.role !== 'SIGNER')),
    ...buildApprovalBlock('Imzolandi:', signedApprovals.filter((a) => a.role === 'SIGNER')),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // 2.0 cm
              right: 850, // 1.5 cm
              bottom: qrBuffer ? 1700 : 1134, // QR-kod pastki qismda o'rtada turadi
              left: 1701, // 3.0 cm
              footer: 500,
            },
          },
        },
        footers: qrBuffer
          ? {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 20 },
                children: [
                  new ImageRun({
                    data: qrBuffer,
                    transformation: { width: 80, height: 80 },
                    type: 'png',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  run(`Haqiqiylikni tekshirish uchun skanerlang • № ${docData.regNumber} • SamDU ShortDoc`, {
                    size: 14,
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        }
          : undefined,
        children: [
          // 1. Shapka: chap tomoni bo'sh, o'ng tomonda kimga va kimdan
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noTableBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 54, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [new Paragraph({})],
                  }),
                  new TableCell({
                    width: { size: 46, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.LEFT,
                        spacing: { line: 276, after: 160 },
                        children: [run(receiverText, { bold: true })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.LEFT,
                        spacing: { line: 276, after: 0 },
                        children: [run(senderText, { bold: true })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // 2. Sarlavha (BILDIRISH)
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 900, after: 400 },
            children: [run(titleText, { bold: true })],
          }),

          // 3. Asosiy matn: tekislangan, birinchi qator surilgan, 1.5 oraliq
          ...bodyParagraphs.map(
            (text, idx) =>
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 709 },
                spacing: { line: 360, after: idx === bodyParagraphs.length - 1 ? 700 : 0 },
                children: [run(text)],
              })
          ),

          // 4. Imzo qatori: chapda lavozim, o'ngda qisqa F.I.Sh.
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noTableBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 62, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.LEFT,
                        spacing: { line: 276 },
                        children: [run(signerPosition, { bold: true })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 38, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    verticalAlign: 'bottom' as any,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [run(initialsName, { bold: true })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Kelishuvchilar (imzo qo'ygan shaxslar) ro'yxati
          ...approvalParagraphs,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
