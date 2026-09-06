const safePdfText = (value) => String(value ?? '').replace(/[^\x20-\x7e]/g, '?').replace(/[\\()]/g, (character) => `\\${character}`).slice(0, 180);

export const invoicePdfFor = (invoice, payments = [], schedule = []) => {
  const paid = Number(invoice.paidAmount || 0);
  const lines = [
    'NORTHSTAR SERVICE INVOICE', '',
    `Customer: ${invoice.customer}`, `Invoice: ${invoice.id}`, `Status: ${invoice.status}`, `Due: ${invoice.due || 'On receipt'}`, '',
    `Total: $${Number(invoice.amount || 0).toFixed(2)}`, `Paid: $${paid.toFixed(2)}`, `Balance: $${Number(invoice.balance ?? invoice.amount ?? 0).toFixed(2)}`,
    ...(invoice.lineItems?.length ? ['', 'Invoice details', ...invoice.lineItems.map((item) => `${item.description} · ${item.quantity} x $${Number(item.unitPrice).toFixed(2)} = $${Number(item.amount).toFixed(2)}`)] : []),
    ...(payments.length ? ['', 'Settled payments', ...payments.slice(0, 12).map((item) => `${item.method} · $${Number(item.amount).toFixed(2)} · ${item.paidAt || item.reference || ''}`)] : []),
    ...(schedule.length ? ['', 'Payment plan', ...schedule.slice(0, 12).map((item) => `Payment ${item.sequence} · $${Number(item.amount).toFixed(2)} · ${item.due} · ${item.status}`)] : []),
    '', 'Thank you for choosing Northstar service.'
  ].map(safePdfText);
  const content = ['BT', '/F1 11 Tf', ...lines.map((line, index) => `1 0 0 1 54 ${760 - index * 17} Tm (${line}) Tj`), 'ET'].join('\n');
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [0]; objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf, 'ascii')); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; }); const xref = Buffer.byteLength(pdf, 'ascii'); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
};
