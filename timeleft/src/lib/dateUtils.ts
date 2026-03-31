export function differenceInDays(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function differenceInDaysSigned(targetDate: Date, fromDate: Date): number {
  const diffTime = targetDate.getTime() - fromDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

export function calculateRelationshipStats(rel: any) {
  const today = new Date();
  const meet = new Date(rel.meetDate);
  const end = new Date(rel.endDate);
  
  const totalDays = differenceInDays(meet, end);
  const passedDays = differenceInDaysSigned(today, meet) * -1;
  const leftDays = differenceInDaysSigned(end, today);
  
  const progress = totalDays > 0 ? Math.max(0, Math.min(100, (passedDays / totalDays) * 100)) : 0;
  
  return { totalDays, passedDays, leftDays, progress };
}

export function calculateMilestoneStats(ms: any, birthDate?: string) {
  const today = new Date();
  const created = new Date(ms.createdAt);
  let target = new Date();

  if (ms.type === 'date' || ms.type === 'event') {
    target = new Date(ms.targetDate);
  } else if (ms.type === 'age' && birthDate) {
    target = addYears(new Date(birthDate), ms.targetAge);
  }

  const totalDays = differenceInDays(created, target);
  const passedDays = differenceInDaysSigned(today, created) * -1;
  const leftDays = differenceInDaysSigned(target, today);
  
  const progress = totalDays > 0 ? Math.max(0, Math.min(100, (passedDays / totalDays) * 100)) : 0;
  
  const yearsLeft = Math.floor(leftDays / 365);
  const monthsLeft = Math.floor((leftDays % 365) / 30);
  
  const weightOfToday = leftDays > 0 ? (1 / leftDays) : 0;

  return { targetDate: target, totalDays, passedDays, leftDays, progress, yearsLeft, monthsLeft, weightOfToday };
}
