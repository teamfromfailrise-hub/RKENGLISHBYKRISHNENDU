// Pulls a flat list of {text, x0, x1} lines out of whatever shape Tesseract.js gives back —
// different versions nest this differently, so we try the flat form first and fall back to
// walking the block -> paragraph -> line hierarchy.
export function extractLines(data) {
  const lines = [];
  if (Array.isArray(data?.lines) && data.lines.length) {
    data.lines.forEach((l) => {
      if (l?.text?.trim() && l.bbox) lines.push({ text: l.text, x0: l.bbox.x0, x1: l.bbox.x1 });
    });
    if (lines.length) return lines;
  }
  (data?.blocks || []).forEach((block) => {
    (block.paragraphs || []).forEach((para) => {
      (para.lines || []).forEach((line) => {
        if (line?.text?.trim() && line.bbox) lines.push({ text: line.text, x0: line.bbox.x0, x1: line.bbox.x1 });
      });
    });
  });
  return lines;
}

const ADDRESS_START_RE = /^to,?$/i;
const SALUTATION_RE = /^(dear\s.+|sir\s*\/?\s*madam[,]?$|sir[,]?$|madam[,]?$)/i;
const VALEDICTION_RE = /^thanking\s+you,?$/i;
const SUBSCRIPTION_RE = /^(yours\s+(faithfully|sincerely|obediently|truly|affectionately|lovingly|ever)|sincerely\s+yours)[,.]?$/i;
const DATED_RE = /^dated[:\s]/i;
const DATE_ANY_RE = /\b(\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)|(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}))\b/i;
const NOTICE_RE = /^notice$/i;

function align(line, pageWidth) {
  if (!line || !pageWidth) return null;
  const center = (line.x0 + line.x1) / 2 / pageWidth;
  if (center > 0.6) return 'right';
  if (center < 0.4) return 'left';
  return 'center';
}
function clean(text) {
  return (text || '').replace(/[,.]?$/, '').trim();
}

// Returns a best-guess breakdown of the scanned letter/notice. Every field is meant to be
// reviewed and corrected on screen before it's saved — this is pattern matching over line
// positions and a handful of known phrases, not true understanding of the page.
export function classifyScan(lines, pageWidth) {
  const nonEmpty = lines.map((l) => ({ ...l, text: l.text.trim() })).filter((l) => l.text);
  const n = nonEmpty.length;

  let addressStartIdx = -1, salutationIdx = -1, valedictionIdx = -1, subscriptionIdx = -1, dateIdx = -1, noticeSeen = false;

  nonEmpty.forEach((l, idx) => {
    if (addressStartIdx === -1 && ADDRESS_START_RE.test(l.text)) addressStartIdx = idx;
    if (salutationIdx === -1 && SALUTATION_RE.test(l.text)) salutationIdx = idx;
    if (VALEDICTION_RE.test(l.text)) valedictionIdx = idx;
    if (SUBSCRIPTION_RE.test(l.text)) subscriptionIdx = idx;
    if (DATED_RE.test(l.text)) dateIdx = idx;
    else if (dateIdx === -1 && DATE_ANY_RE.test(l.text)) dateIdx = idx;
    if (NOTICE_RE.test(l.text)) noticeSeen = true;
  });

  // Lines between "To," and the salutation are the receiver's address.
  const receiverAddressLines =
    addressStartIdx > -1
      ? nonEmpty.slice(addressStartIdx + 1, salutationIdx > -1 ? salutationIdx : addressStartIdx + 6).map((l) => l.text)
      : [];

  // Lines after the closing subscription (and before any "Dated" line) are the sender's
  // name + address block — the first of them is the name, the rest the address.
  let senderName = null, senderAddressLines = [];
  const closeAnchor = subscriptionIdx > -1 ? subscriptionIdx : valedictionIdx;
  if (closeAnchor > -1) {
    const after = nonEmpty.slice(closeAnchor + 1);
    const datedRelIdx = after.findIndex((l) => DATED_RE.test(l.text));
    const block = datedRelIdx > -1 ? after.slice(0, datedRelIdx) : after;
    senderName = block[0]?.text || null;
    senderAddressLines = block.slice(1).map((l) => l.text);
  }

  // Notices don't have a "To," addressee or a closing subscription — the last non-empty
  // line is almost always the issuing authority's name/designation instead.
  if (closeAnchor < 0 && noticeSeen && nonEmpty.length) {
    senderName = nonEmpty[nonEmpty.length - 1].text;
  }

  let closingText = null;
  if (valedictionIdx > -1 && subscriptionIdx > -1) {
    closingText = clean(nonEmpty[valedictionIdx].text) + ',\n' + clean(nonEmpty[subscriptionIdx].text);
  } else if (subscriptionIdx > -1) {
    closingText = clean(nonEmpty[subscriptionIdx].text);
  } else if (valedictionIdx > -1) {
    closingText = clean(nonEmpty[valedictionIdx].text);
  }

  const datePosition = dateIdx < 0 ? 'top' : dateIdx < n * 0.3 ? 'top' : 'bottom';

  return {
    dateAlign: align(nonEmpty[dateIdx], pageWidth) || 'right',
    datePosition,
    dateText: dateIdx > -1 ? nonEmpty[dateIdx].text : null,
    salutationText: salutationIdx > -1 ? clean(nonEmpty[salutationIdx].text) : null,
    closingAlign: align(nonEmpty[closeAnchor], pageWidth) || (noticeSeen ? 'right' : 'left'),
    closingText,
    receiverAddressLines,
    senderName,
    senderAddressLines,
    noticeDetected: noticeSeen,
    linesRead: n
  };
}
