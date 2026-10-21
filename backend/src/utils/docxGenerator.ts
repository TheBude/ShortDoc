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
 * Uzbek F.I.Sh abbreviator:
 * e.g. "Omonov Ikromjon Esonboy o'g'li" -> "I. Omonov"
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
 * Format date in Uzbek official standard: "29.09.2026"
 */
function formatDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export async function generateDocumentDocx(docData: DocumentDataForDocx): Promise<Buffer> {
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

  const blueBorder = { style: BorderStyle.SINGLE, size: 10, color: '003366' };
  const stampBorders = { top: blueBorder, bottom: blueBorder, left: blueBorder, right: blueBorder };

  // Receiver formatting (Shapka - top right, to whom)
  const defaultReceiver =
    'Sharof Rashidov nomidagi Samarqand davlat universiteti rektori prof. R.I. Xalmuradovga';
  const receiverText = docData.receiver?.trim() || defaultReceiver;

  // Sender formatting (Shapka - from whom)
  let senderText = docData.sender?.trim();
  if (!senderText) {
    const depName = docData.department?.name || 'Universitet';
    const pos = docData.creator?.position || 'xodimi';
    const name = docData.creator?.fullName || 'Xodim';
    senderText = `${depName} ${pos} ${name} tomonidan.`;
  } else if (!senderText.endsWith('tomonidan.') && !senderText.endsWith('tomonidan')) {
    senderText = `${senderText} tomonidan.`;
  }

  // Title formatting (Center)
  let titleText = 'Bildirish';
  const cat = (docData.category || '').toLowerCase();
  if (cat.includes('ariza')) {
    titleText = 'Ariza';
  } else if (cat.includes('xizmat') || cat.includes('xat')) {
    titleText = 'Xizmat xati';
  } else if (cat.includes('buyru')) {
    titleText = 'Buyruq loyihasi';
  } else if (cat.includes('qaror')) {
    titleText = 'Qaror';
  } else if (docData.category) {
    titleText = docData.category;
  }

  // Body text formatting
  const bodyText =
    docData.summary?.trim() ||
    docData.title?.trim() ||
    'Mazkur hujjat bo‘yicha batafsil ma’lumot kiritilmagan.';

  // Short creator name for signature line (e.g. "I. Omonov")
  const shortAuthorName = formatShortName(docData.creator?.fullName || docData.sender || '');
  const documentDate = formatDate(docData.createdAt);

  // Approval stamps / lines for the stamp box
  const approvedList = (docData.approvals || []).filter((a) => a.status === 'APPROVED');
  const stampDepName =
    docData.department?.name?.toUpperCase() ||
    'RAQAMLI TA\'LIM TEXNOLOGIYALARI MARKAZI';

  // Construct Stamp paragraphs
  const stampChildren: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
      children: [
        new TextRun({
          text: stampDepName,
          font: 'Times New Roman',
          size: 18,
          bold: true,
          color: '003366',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: 'ELEKTRON RAQAMLI IMZO BILAN TASDIQLANGAN',
          font: 'Times New Roman',
          size: 14,
          bold: true,
          color: '003366',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: `№ ${docData.regNumber} | ${documentDate}`,
          font: 'Times New Roman',
          size: 15,
          color: '003366',
          bold: true,
        }),
      ],
    }),
  ];

  if (approvedList.length > 0) {
    approvedList.forEach((app) => {
      stampChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 },
          children: [
            new TextRun({
              text: `Tasdiqladi: ${formatShortName(app.approver.fullName)} (${app.signedAt ? formatDate(new Date(app.signedAt)) : documentDate})`,
              font: 'Times New Roman',
              size: 13,
              color: '1e3a8a',
            }),
          ],
        })
      );
    });
  }

  stampChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `ID: SamDU-${docData.id.slice(0, 8).toUpperCase()}`,
          font: 'Times New Roman',
          size: 12,
          color: '64748b',
        }),
      ],
    })
  );

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
              left: 1700,   // 3.0 cm (official doc margin for binding)
            },
          },
        },
        children: [
          // 1. Shapka (Header Table: 42% empty, 58% receiver & sender)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 42, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [new Paragraph({})],
                  }),
                  new TableCell({
                    width: { size: 58, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new Paragraph({
                        spacing: { line: 260, after: 80 },
                        children: [
                          new TextRun({
                            text: receiverText,
                            font: 'Times New Roman',
                            size: 26, // 13 pt
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { line: 260, after: 180 },
                        children: [
                          new TextRun({
                            text: senderText,
                            font: 'Times New Roman',
                            size: 26, // 13 pt
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
          new Paragraph({ spacing: { before: 240, after: 240 } }),

          // 2. Title (e.g. 'Bildirish')
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 180, after: 260 },
            children: [
              new TextRun({
                text: titleText,
                font: 'Times New Roman',
                size: 32, // 16 pt
                bold: true,
              }),
            ],
          }),

          // 3. Document Title / Subject (if distinct from category title)
          ...(docData.title && docData.title.trim().toLowerCase() !== titleText.toLowerCase()
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 260 },
                  children: [
                    new TextRun({
                      text: `(${docData.title})`,
                      font: 'Times New Roman',
                      size: 22,
                      italics: true,
                      color: '475569',
                    }),
                  ],
                }),
              ]
            : []),

          // 4. Main Body Text (Mazmuni)
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 }, // 1.25 cm standard xatboshi
            spacing: { line: 360, after: 600 }, // 1.5 line spacing
            children: [
              new TextRun({
                text: bodyText,
                font: 'Times New Roman',
                size: 28, // 14 pt standard
              }),
            ],
          }),

          // 5. Date, Signature and Full Name row (exactly matching the user photo)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  // Left: Date
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: documentDate,
                            font: 'Times New Roman',
                            size: 26,
                            bold: true,
                          }),
                        ],
                      }),
                    ],
                  }),
                  // Center: Signature line
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: '_________________',
                            font: 'Times New Roman',
                            size: 24,
                            color: '64748b',
                          }),
                          new TextRun({
                            text: ' (imzo)',
                            font: 'Times New Roman',
                            size: 16,
                            italics: true,
                            color: '94a3b8',
                          }),
                        ],
                      }),
                    ],
                  }),
                  // Right: Short Full Name (e.g. "I. Omonov")
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: shortAuthorName,
                            font: 'Times New Roman',
                            size: 26,
                            bold: true,
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
          new Paragraph({ spacing: { before: 600, after: 150 } }),

          // 6. Bottom-left Official Stamp Box (Matching the blue ink stamp on the uploaded photo)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    borders: stampBorders,
                    margins: { top: 140, bottom: 140, left: 180, right: 180 },
                    children: stampChildren,
                  }),
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [new Paragraph({})],
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
