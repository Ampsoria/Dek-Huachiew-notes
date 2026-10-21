import rawCourses from '../data/courses.json';

export type CoursePath = { faculty: string; branch: string };
export type Course = { code: string; title: string; isGE: boolean; paths: CoursePath[] };
export const courses = rawCourses as Course[];
export const faculties = [...new Set(courses.flatMap((course) => course.paths.map((path) => path.faculty)))].sort((a, b) => a.localeCompare(b, 'th'));
export const geCourses = courses.filter((course) => course.isGE);

export function normalizeCode(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

export function getCourse(code: string) {
  return courses.find((course) => course.code === normalizeCode(code));
}

export function searchCourses(query: string, limit = 40) {
  const input = query.trim();
  if (!input) return [];
  const codeQuery = normalizeCode(input);
  const titleQuery = input.toLocaleLowerCase();
  return courses
    .map((course) => {
      let rank = 0;
      if (course.code === codeQuery) rank = 4;
      else if (course.code.startsWith(codeQuery)) rank = 3;
      else if (course.code.includes(codeQuery)) rank = 2;
      else if (course.title.toLocaleLowerCase().includes(titleQuery)) rank = 1;
      return { course, rank };
    })
    .filter((item) => item.rank > 0)
    .sort((a, b) => b.rank - a.rank || a.course.code.localeCompare(b.course.code, 'en'))
    .slice(0, limit)
    .map((item) => item.course);
}

export function coursesInFaculty(faculty: string, branch?: string) {
  return courses.filter((course) => !course.isGE && course.paths.some((path) => path.faculty === faculty && (!branch || path.branch === branch)));
}

export function branchesInFaculty(faculty: string) {
  return [...new Set(coursesInFaculty(faculty).flatMap((course) => course.paths.filter((path) => path.faculty === faculty).map((path) => path.branch)))].sort((a, b) => a.localeCompare(b, 'th'));
}

export function coursePath(course: Course) {
  if (course.isGE) return 'วิชาศึกษาทั่วไป · GE';
  const first = course.paths[0];
  return first ? `${first.faculty} · ${displayBranch(first.branch)}` : 'ยังไม่ระบุหมวด';
}

export function displayBranch(branch: string) {
  return branch.includes('หมวดคณะโดยตรง') ? 'วิชาในคณะ' : branch;
}
