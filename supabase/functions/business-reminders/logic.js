// Which business payments need a reminder today. Same rules as the app's bzEvents and bzAlerts in biz/biz.js.
// Dates are UTC here (the app uses the phone's time), so a reminder can be a few hours off around midnight.

const pad = n => String(n).padStart(2, '0');
const monthDays = ms => { const [y, m] = ms.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
const dueDate = (ms, day) => ms + '-' + pad(Math.min(monthDays(ms), Math.max(1, Math.round(Number(day)) || 1)));
const shiftMonth = (ms, k) => { const [y, m] = ms.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + k, 1)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1); };
const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d + n)); return x.getUTCFullYear() + '-' + pad(x.getUTCMonth() + 1) + '-' + pad(x.getUTCDate()); };
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const paidAmount = (o, date) => (o && o.paid && Object.prototype.hasOwnProperty.call(o.paid, date)) ? num(o.paid[date]) : 0;
const isPaid = (o, date, due) => { if (!(o && o.paid && Object.prototype.hasOwnProperty.call(o.paid, date))) return false; return due === undefined || paidAmount(o, date) >= num(due) - 0.005; };

export function eventsFor(b, ms) {
  const out = [];
  for (const l of b.loans || []) {
    if (!/^\d{4}-\d{2}$/.test(String(l.start || '')) || l.start > ms) continue;
    const date = dueDate(ms, l.dueDay);
    let before = 0; for (const [k, v] of Object.entries(l.paid || {})) if (k < date) before += num(v);
    const left = num(l.amount) - before;
    if (left <= 0) continue;
    const amount = Math.min(num(l.monthly) || left, left);
    out.push({ kind: 'loan', title: l.name || 'Loan', date, amount, paid: isPaid(l, date, amount) });
  }
  for (const s of b.staff || []) {
    const since = s.since || ms; if (since > ms) continue;
    const date = dueDate(ms, s.payDay); const amount = num(s.salary);
    out.push({ kind: 'staff', title: s.name || 'Team member', date, amount, paid: isPaid(s, date, amount) });
  }
  for (const x of b.bills || []) {
    const amount = num(x.amount);
    if (x.recur === 'once') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(x.date || '')) && x.date.indexOf(ms + '-') === 0) out.push({ kind: 'bill', title: x.name || 'Bill', date: x.date, amount, paid: isPaid(x, x.date, amount) });
      continue;
    }
    const since = x.since || ms; if (since > ms) continue;
    const date = dueDate(ms, x.dueDay);
    out.push({ kind: 'bill', title: x.name || 'Bill', date, amount, paid: isPaid(x, date, amount) });
  }
  return out;
}

// Unpaid payments due within the reminder window, or already overdue.
export function dueItems(data, today) {
  if (!data || data.accountType !== 'business' || !data.business) return [];
  const b = data.business;
  const remind = Math.min(14, Math.max(0, Math.round(Number(b.remindDays)) || 0));
  const soon = addDays(today, Number.isFinite(Number(b.remindDays)) ? remind : 2);
  const cm = today.slice(0, 7);
  let list = [];
  for (const m of [shiftMonth(cm, -1), cm, shiftMonth(cm, 1)]) list = list.concat(eventsFor(b, m));
  return list.filter(e => !e.paid && e.date <= soon).map(e => ({ ...e, late: e.date < today }));
}

export function reminderText(items) {
  const overdue = items.filter(i => i.late).length;
  const total = items.reduce((s, i) => s + i.amount, 0);
  return {
    title: 'Payment reminder',
    tag: 'money-saver-payments',
    body: `${items.length} payment${items.length === 1 ? '' : 's'} to take care of${overdue ? ` (${overdue} overdue)` : ''} · total ${total.toFixed(2)}`
  };
}
