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
} from 'docx';

interface ApproverInfo {
  approver: {
    fullName: string;
    position?: string | null;
  };
  status: string;
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
 * Abbreviate Uzbek names:
 * e.g. "Omonov Abrorjon Esonboy o'g'li" -> "A. Omonov"
 */
function formatShortName(fullName?: string | null): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const lastName = parts[0];
  const firstName = parts[1];
  const initial = firstName ? `${firstName[0].toUpperCase()}.` : '';
  return `${initial} ${lastName}`;
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

export async function generateDocumentDocx(
  docData: DocumentDataForDocx,
  verifyBaseUrl: string = config.APP_URL
): Promise<Buffer> {
  const INK_COLOR = '002060'; // Royal Navy Blue ink color matching photo

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

  // Receiver formatting (Shapka - top right)
  const defaultReceiver =
    'Sharof Rashidov nomidagi\nSamarqand davlat universiteti\nrektori prof. R.I. Xalmuradovga';
  const receiverText = docData.receiver?.trim() || defaultReceiver;

  // Sender formatting (Shapka - from whom)
  let senderText = docData.sender?.trim();
  if (!senderText) {
    const depName = docData.department?.name || 'Raqamli ta\'lim texnologiyalari markazi';
    const pos = docData.creator?.position || 'xodimi';
    const name = docData.creator?.fullName || 'Xodim';
    senderText = `${depName} ${pos} ${name} tomonidan.`;
  } else if (!senderText.endsWith('tomonidan.') && !senderText.endsWith('tomonidan')) {
    senderText = `${senderText} tomonidan.`;
  }

  // Title formatting (Center)
  let titleText = 'Bildirildi.';
  const cat = (docData.category || '').toLowerCase();
  if (cat.includes('ariza')) {
    titleText = 'Ariza.';
  } else if (cat.includes('xizmat') || cat.includes('xat')) {
    titleText = 'Xizmat xati.';
  } else if (cat.includes('buyru')) {
    titleText = 'Buyruq.';
  } else if (cat.includes('qaror')) {
    titleText = 'Qaror.';
  } else if (docData.category) {
    titleText = docData.category.endsWith('.') ? docData.category : `${docData.category}.`;
  }

  // Body text formatting
  const bodyText =
    docData.summary?.trim() ||
    docData.title?.trim() ||
    'Men 2026-yil 29-sentabrdan kasallikdan so\'ng ishga chiqqanligimi ma\'lum qilaman.';

  // Short creator name for signature line (e.g. "A. Omonov")
  const shortAuthorName = formatShortName(docData.creator?.fullName || docData.sender || 'A. Omonov');
  const documentDate = formatDate(docData.createdAt);

  // Department name for stamp
  const stampDepName = docData.department?.name?.toUpperCase() || 'RAQAMLI TA\'LIM TEXNOLOGIYALARI MARKAZI';
  const stampLines = stampDepName.split(/\s+(?=TEXNOLOGIYALARI|MARKAZI|BO'LIMI|FAKULTETI)/i);
  const stampLine1 = stampLines[0] || 'RAQAMLI TA\'LIM';
  const stampLine2 = stampLines.slice(1).join(' ') || 'TEXNOLOGIYALARI MARKAZI';

  // Generate QR Code buffer pointing to verification page
  const verifyUrl = `${verifyBaseUrl.replace(/\/+$/, '')}/verify/${docData.id}`;
  const qrBuffer = await QRCode.toBuffer(verifyUrl, {
    type: 'png',
    width: 140,
    margin: 1,
    color: {
      dark: '#002060', // Dark blue QR code matching the ink
      light: '#ffffff',
    },
  });

  // Build the complete docx document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,    // 2.0 cm
              right: 1134,  // 2.0 cm
              bottom: 1134, // 2.0 cm
              left: 1417,   // 2.5 cm
            },
          },
        },
        children: [
          // 1. Shapka (Header Table: 38% empty on left, 62% on right)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 38, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [new Paragraph({})],
                  }),
                  new TableCell({
                    width: { size: 62, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new Paragraph({
                        spacing: { line: 260, after: 80 },
                        children: receiverText.split('\n').map(
                          (line, idx, arr) =>
                            new TextRun({
                              text: line,
                              font: 'Times New Roman',
                              size: 26, // 13 pt
                              italics: true,
                              color: INK_COLOR,
                              break: idx > 0 ? 1 : 0,
                            })
                        ),
                      }),
                      new Paragraph({
                        spacing: { line: 260, after: 180 },
                        children: [
                          new TextRun({
                            text: senderText,
                            font: 'Times New Roman',
                            size: 26, // 13 pt
                            italics: true,
                            color: INK_COLOR,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Spacing
          new Paragraph({ spacing: { before: 280, after: 200 } }),

          // 2. Title (e.g. 'Bildirildi.')
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 320 },
            children: [
              new TextRun({
                text: titleText,
                font: 'Times New Roman',
                size: 34, // 17 pt
                bold: true,
                italics: true,
                color: INK_COLOR,
              }),
            ],
          }),

          // 3. Main Body Text (Mazmuni)
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: 360, after: 640 }, // 1.5 line spacing
            children: [
              new TextRun({
                text: bodyText,
                font: 'Times New Roman',
                size: 28, // 14 pt
                italics: true,
                color: INK_COLOR,
              }),
            ],
          }),

          // 4. Date, Realistic Signature and Full Name row (exactly matching photo)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  // Left: Date
                  new TableCell({
                    width: { size: 32, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: documentDate,
                            font: 'Times New Roman',
                            size: 28,
                            italics: true,
                            color: INK_COLOR,
                          }),
                        ],
                      }),
                    ],
                  }),
                  // Center: Bo‘sh joy (qo‘lda imzo qo‘yish uchun bo‘sh qoldiriladi)
                  new TableCell({
                    width: { size: 36, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [new Paragraph({})],
                  }),
                  // Right: Short Full Name (e.g. "A. Omonov")
                  new TableCell({
                    width: { size: 32, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: shortAuthorName,
                            font: 'Times New Roman',
                            size: 28,
                            italics: true,
                            color: INK_COLOR,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Spacing before stamp
          new Paragraph({ spacing: { before: 680, after: 150 } }),

          // 5. Bottom Row: Stamp on Left + Authenticity QR-Code on Right
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  // Left: Official Organization Stamp
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new Paragraph({
                        spacing: { after: 30 },
                        children: [
                          new TextRun({
                            text: stampLine1,
                            font: 'Times New Roman',
                            size: 18,
                            bold: true,
                            color: INK_COLOR,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 40 },
                        children: [
                          new TextRun({
                            text: stampLine2,
                            font: 'Times New Roman',
                            size: 18,
                            bold: true,
                            color: INK_COLOR,
                          }),
                        ],
                      }),
                      // Bo‘sh imzo joyi (muhr yoki imzo uchun)
                      new Paragraph({
                        spacing: { before: 160, after: 160 },
                        children: [],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: documentDate.split('.').join('. '),
                            font: 'Times New Roman',
                            size: 24,
                            italics: true,
                            color: INK_COLOR,
                          }),
                        ],
                      }),
                    ],
                  }),

                  // Right: Scannable QR-Code for Authenticity Verification
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        spacing: { after: 40 },
                        children: [
                          new ImageRun({
                            data: qrBuffer,
                            transformation: { width: 85, height: 85 },
                            type: 'png',
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        spacing: { after: 20 },
                        children: [
                          new TextRun({
                            text: 'Haqiqiylikni tekshirish uchun skanerlang',
                            font: 'Times New Roman',
                            size: 15,
                            italics: true,
                            color: INK_COLOR,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: `№ ${docData.regNumber} | SamDU ShortDoc`,
                            font: 'Times New Roman',
                            size: 14,
                            bold: true,
                            color: INK_COLOR,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
