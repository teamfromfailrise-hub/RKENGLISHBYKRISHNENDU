import { jsPDF } from 'jspdf';
import { WRITING_TYPES, todayStr, paragraphs, textLines } from './constants';

function xFor(align, pageW, marginX) {
  if (align === 'right') return pageW - marginX;
  if (align === 'center') return pageW / 2;
  return marginX;
}
function optsFor(align) {
  if (align === 'right') return { align: 'right' };
  if (align === 'center') return { align: 'center' };
  return undefined;
}

function drawWritingToPdf(doc, w, startY, layout = {}) {
  const marginX = 18, pageW = 210, maxW = pageW - marginX * 2;
  const meta = WRITING_TYPES[w.type] || WRITING_TYPES.other;
  let y = startY;

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 110, 90);
  doc.text(
    `${meta.label}  •  ${w.board}  •  Class ${w.class || w.cls}${w.chapter ? '  •  ' + w.chapter : ''}`,
    marginX,
    y
  );
  y += 7;

  doc.setFontSize(15);
  doc.setTextColor(30, 45, 70);
  doc.setFont('times', 'bold');
  const titleLines = doc.splitTextToSize(w.title, maxW);
  doc.text(titleLines, marginX, y);
  y += titleLines.length * 7 + 4;

  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);

  function addPara(text, opts = {}) {
    const lines = doc.splitTextToSize(text, maxW);
    lines.forEach((line) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, xFor(opts.align, pageW, marginX), y, optsFor(opts.align));
      y += 6.5;
    });
    y += opts.gap !== undefined ? opts.gap : 3;
  }

  const dateAlign = layout.dateAlign || 'right';
  const closingAlign = layout.closingAlign; // undefined -> left, matches the previous default

  if (meta.format === 'formal_letter' || meta.format === 'editor_letter') {
    const isEditor = meta.format === 'editor_letter';
    const datePosition = layout.datePosition || 'bottom';
    const receiverLines = textLines(w.receiverAddress);
    const senderLines = textLines(w.senderAddress);

    if (datePosition === 'top') addPara(todayStr(), { align: dateAlign, gap: 5 });

    addPara('To,');
    if (isEditor) {
      addPara('The Editor,');
      addPara((w.recipientName || '[Newspaper Name]') + (receiverLines.length ? ',' : ''));
    } else {
      addPara((w.recipientName || '[Recipient / Designation]') + (receiverLines.length ? ',' : ''));
    }
    receiverLines.forEach((line, i) => addPara(line + (i < receiverLines.length - 1 ? ',' : ''), { gap: i === receiverLines.length - 1 ? 5 : 0 }));
    if (!receiverLines.length) y += 2;

    addPara((w.salutation || 'Sir') + ',', { gap: 5 });
    if (w.opening) addPara(w.opening);
    paragraphs(w.body).forEach((p) => addPara(p));
    y += 2;

    textLines(w.closing || 'Thanking you,\nYours faithfully').forEach((line, i, arr) =>
      addPara(line, { align: closingAlign, gap: i === arr.length - 1 ? 4 : 0 })
    );
    addPara(w.senderName || '[Your Name]', { align: closingAlign, gap: senderLines.length ? 0 : 3 });
    senderLines.forEach((line, i) => addPara(line, { align: closingAlign, gap: i === senderLines.length - 1 ? 3 : 0 }));
    if (datePosition === 'bottom') addPara('Dated ' + todayStr(), { align: closingAlign });
  } else if (meta.format === 'personal_letter') {
    const senderLines = textLines(w.senderAddress);
    senderLines.forEach((line) => addPara(line, { align: dateAlign, gap: 0 }));
    addPara(todayStr(), { align: dateAlign, gap: 5 });
    addPara('Dear ' + (w.recipientName || '____') + ',', { gap: 5 });
    if (w.opening) addPara(w.opening);
    paragraphs(w.body).forEach((p) => addPara(p));
    y += 2;
    textLines(w.closing || 'Yours affectionately').forEach((line) => addPara(line, { align: closingAlign, gap: 0 }));
    addPara(w.senderName || '[Your Name]', { align: closingAlign });
  } else if (meta.format === 'notice') {
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(w.instName || '[Institution Name]', 105, y, { align: 'center' });
    y += 8;
    doc.setFontSize(13);
    doc.text('N O T I C E', 105, y, { align: 'center' });
    y += 2;
    doc.setLineWidth(0.4);
    doc.line(95, y + 1, 115, y + 1);
    y += 8;
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.text('Date: ' + todayStr(), xFor(dateAlign, pageW, marginX), y, optsFor(dateAlign));
    y += 8;
    doc.setFont('times', 'bold');
    doc.text(w.noticeSubject || w.title, marginX, y);
    y += 8;
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    paragraphs(w.body).forEach((p) => addPara(p));
    y += 6;
    addPara(w.issuedBy || '[Issued by]', { align: closingAlign || 'right' });
  } else if (meta.format === 'report') {
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    addPara((w.place || '[Place]') + ', ' + todayStr() + ': (Own Correspondent) —', { gap: 4 });
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    paragraphs(w.body).forEach((p) => addPara(p));
  } else {
    paragraphs(w.body).forEach((p) => addPara(p));
  }

  return y;
}

// Stamped on every single physical page of the PDF — including pages a long writing
// overflows onto — so the branding travels with the document wherever it's shared.
function drawBrandFooter(doc, pageNum, totalPages) {
  const pageW = 210, marginX = 18;
  const barY = 281;

  doc.setDrawColor(163, 50, 61);
  doc.setLineWidth(0.5);
  doc.line(marginX, barY, pageW - marginX, barY);

  const cx = marginX + 3, cy = barY + 6.5;
  doc.setFillColor(31, 58, 95);
  doc.circle(cx, cy, 3.2, 'F');
  doc.setFillColor(163, 50, 61);
  doc.roundedRect(cx - 1.7, cy + 0.4, 3.4, 1.1, 0.5, 0.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(31, 58, 95);
  doc.text('RK English', cx + 6, cy - 0.6);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(114, 106, 90);
  doc.text('Every writing, always at hand  •  Made by Krishnendu © 2026', cx + 6, cy + 3.4);

  if (totalPages > 1) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(114, 106, 90);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageW - marginX, cy + 1.2, { align: 'right' });
  }
}

// `templates` is the Settings-driven per-type customisation object (may be undefined/empty) —
// used here to pull each type's learned layout, if she's taught one via a photo.
export function buildPdf(writings, templates) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  writings.forEach((w, i) => {
    if (i > 0) doc.addPage();
    const layout = templates?.[w.type]?.layout || {};
    drawWritingToPdf(doc, w, 20, layout);
  });
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawBrandFooter(doc, p, totalPages);
  }
  return doc;
}

export async function exportPdf(writings, templates) {
  const doc = buildPdf(writings, templates);
  const filename =
    (writings.length === 1 ? writings[0].title.replace(/[^\w\- ]/g, '').slice(0, 40) : 'RK-English-writings') + '.pdf';
  doc.save(filename);
}

export async function shareOnWhatsapp(writings, templates) {
  try {
    const doc = buildPdf(writings, templates);
    const blob = doc.output('blob');
    const filename =
      (writings.length === 1 ? writings[0].title.replace(/[^\w\- ]/g, '').slice(0, 40) : 'RK-English-writings') + '.pdf';
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'RK English', text: writings.length === 1 ? writings[0].title : 'Writings from RK English' });
      return { ok: true };
    }
  } catch (e) {
    // fall through to the text-link fallback below
  }
  const text = encodeURIComponent(
    writings.length === 1
      ? `${writings[0].title}\n\n${writings[0].body}\n\n— RK English (Made by Krishnendu © 2026)`
      : `Sharing ${writings.length} writings from RK English:\n` +
          writings.map((w) => '• ' + w.title).join('\n') +
          `\n\n— Made by Krishnendu © 2026`
  );
  window.open('https://wa.me/?text=' + text, '_blank');
  return { ok: false, fallback: true };
}
