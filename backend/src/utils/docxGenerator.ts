import zlib from 'zlib';
import QRCode from 'qrcode';
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
 * Creates a realistic blue ink signature PNG buffer in pure Node.js (no native deps)
 */
function createSignaturePng(width = 240, height = 90, isStamp = false): Buffer {
  const buffer = Buffer.alloc(width * height * 4, 0); // Transparent RGBA

  function setPixel(x: number, y: number, r: number, g: number, b: number, a: number) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = (y * width + x) * 4;
    buffer[idx] = r;
    buffer[idx + 1] = g;
    buffer[idx + 2] = b;
    buffer[idx + 3] = a;
  }

  function drawThickLine(x0: number, y0: number, x1: number, y1: number, r: number, g: number, b: number, thickness = 2.2) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist * 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = x0 + dx * t;
      const cy = y0 + dy * t;
      const rad = Math.ceil(thickness);
      for (let ox = -rad; ox <= rad; ox++) {
        for (let oy = -rad; oy <= rad; oy++) {
          const d = Math.hypot(ox, oy);
          if (d <= thickness) {
            const alpha = Math.floor(255 * Math.max(0, 1 - (d / (thickness + 0.5)) * 0.4));
            setPixel(Math.round(cx + ox), Math.round(cy + oy), r, g, b, alpha);
          }
        }
      }
    }
  }

  // Draw natural pen stroke path (ink color #002060 - R:0, G:32, B:96)
  const points: [number, number][] = isStamp
    ? [
        [20, 50], [35, 40], [50, 20], [60, 15], [65, 30], [55, 60],
        [70, 65], [85, 45], [95, 25], [105, 40], [120, 55], [140, 45], [160, 40], [180, 42],
      ]
    : [
        [25, 65], [40, 50], [55, 25], [68, 12], [72, 16], [68, 45], [62, 75],
        [72, 78], [88, 68], [102, 30], [112, 10], [116, 14], [108, 45], [112, 65],
        [128, 50], [142, 45], [158, 55], [172, 38], [190, 28], [210, 32],
      ];

  for (let i = 0; i < points.length - 1; i++) {
    drawThickLine(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], 0, 32, 96, 2.2);
  }
  // Signature underline swash
  drawThickLine(40, 75, 110, 80, 0, 32, 96, 2.4);
  drawThickLine(110, 80, 205, 72, 0, 32, 96, 1.8);

  // PNG framing
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0;
    buffer.copy(rawData, y * rowSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(rawData);

  const crcTable = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }

  function crc32(buf: Buffer): number {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const toCrc = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(toCrc), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
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
  verifyBaseUrl: string = 'http://172.16.1.4:3000'
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

  // Generate realistic handwritten signature images
  const mainSignaturePng = createSignaturePng(240, 90, false);
  const stampSignaturePng = createSignaturePng(200, 80, true);

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
                  // Center: Blue Pen Signature
                  new TableCell({
                    width: { size: 36, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new ImageRun({
                            data: mainSignaturePng,
                            transformation: { width: 115, height: 44 },
                            type: 'png',
                          }),
                        ],
                      }),
                    ],
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
                      new Paragraph({
                        spacing: { after: 40 },
                        children: [
                          new ImageRun({
                            data: stampSignaturePng,
                            transformation: { width: 95, height: 38 },
                            type: 'png',
                          }),
                        ],
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
