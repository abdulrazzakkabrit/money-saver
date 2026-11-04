// Checks the reminder rules against the app's rules (same cases as biz/biz.js)
import { dueItems, reminderText } from './functions/business-reminders/logic.js';
let fails = 0; const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) fails++; };
const today = '2026-11-04';
const base = { accountType: 'business', business: { remindDays: 2, days: {}, expenses: [], loans: [], staff: [], bills: [] } };
// 1. personal account gives nothing
ok('personal accounts get no business reminders', dueItems({ accountType: 'personal', business: base.business }, today).length === 0);
// 2. salary due in 2 days, unpaid: reminded
const d1 = structuredClone(base); d1.business.staff = [{ id: 's', name: 'Maria', salary: 1000, payDay: 6, since: '2026-11', paid: {} }];
ok('salary due in 2 days is reminded', dueItems(d1, today).map(i => i.title).join() === 'Maria');
// 3. same salary due in 5 days: not yet
const d2 = structuredClone(base); d2.business.staff = [{ id: 's', name: 'Maria', salary: 1000, payDay: 9, since: '2026-11', paid: {} }];
ok('salary due in 5 days is not reminded yet', dueItems(d2, today).length === 0);
// 4. part paid is still due; fully paid is not
const d3 = structuredClone(d1); d3.business.staff[0].paid = { '2026-11-06': 400 };
ok('part-paid salary is still reminded', dueItems(d3, today).length === 1);
const d4 = structuredClone(d1); d4.business.staff[0].paid = { '2026-11-06': 1000 };
ok('fully paid salary is not reminded', dueItems(d4, today).length === 0);
// 5. loan: 1000 borrowed, 500 a month, 300 paid on the 1st -> due on the 15th: reminded, amount 500
const d5 = structuredClone(base); d5.business.loans = [{ id: 'l', name: 'Oven', amount: 1000, monthly: 500, dueDay: 6, start: '2026-10', paid: { '2026-10-06': 500 } }];
const r5 = dueItems(d5, today); ok('loan installment due soon is reminded', r5.length === 1 && r5[0].amount === 500);
// 6. overdue bill from last month is still reminded and marked late
const d6 = structuredClone(base); d6.business.bills = [{ id: 'b', name: 'Power', amount: 80, recur: 'monthly', dueDay: 28, since: '2026-09', paid: {} }];
const r6 = dueItems(d6, today); ok('overdue bill from last month is reminded as late', r6.length === 1 && r6[0].late === true);
// 7. the text for the phone
const t = reminderText(r6); ok('reminder text says overdue', /overdue/.test(t.body) && t.title === 'Payment reminder');
// 8. remind days 0: only today or overdue
const d8 = structuredClone(d1); d8.business.remindDays = 0; ok('zero days before means only today or overdue', dueItems(d8, today).length === 0);
// 1.1.3: stock reorder reminders and plans
{
  const due2 = dueItems, txt2 = reminderText;
  const data = { accountType: 'business', business: { remindDays: 1, products: [{ name: 'Tortilla', lastsDays: 7, buys: [{ date: '2026-11-01' }] }, { name: 'Rice', lastsDays: 30, buys: [{ date: '2026-11-01' }] }] } };
  const items = due2(data, '2026-11-08');
  ok('stock to reorder after one week', items.length === 1 && items[0].kind === 'stock' && items[0].title === 'Tortilla');
  ok('reorder text names the product', /Order again: Tortilla/.test(txt2(items).body));
  ok('a business plan gets no reminders', due2({ ...data, business: { ...data.business, stage: 'planning' } }, '2026-11-08').length === 0);
}
console.log(fails ? fails + ' FAILED' : 'ALL REMINDER CHECKS PASSED'); process.exit(fails ? 1 : 0);
