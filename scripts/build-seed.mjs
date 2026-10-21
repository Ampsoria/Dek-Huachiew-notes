import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const courses = JSON.parse(fs.readFileSync(path.join(root, 'src/data/courses.json'), 'utf8'));
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const lines = ['-- Provisional HCU Moodle extract. Review against official curriculum before production use.', 'begin;'];
const faculties = [...new Set(courses.flatMap((course) => course.paths.map((item) => item.faculty)))];
for (const name of faculties) lines.push(`insert into public.faculties(name) values (${quote(name)}) on conflict (name) do nothing;`);
const programs = new Set();
for (const course of courses) for (const { faculty, branch } of course.paths) if (!branch.includes('หมวดคณะโดยตรง')) programs.add(JSON.stringify([faculty, branch]));
for (const pair of programs) {
  const [faculty, branch] = JSON.parse(pair);
  lines.push(`insert into public.programs(faculty_id,name) select id,${quote(branch)} from public.faculties where name=${quote(faculty)} on conflict (faculty_id,name) do nothing;`);
}
for (const course of courses) lines.push(`insert into public.courses(source_key,code,title,is_ge,verified) values (${quote(`moodle:${course.code}`)},${quote(course.code)},${quote(course.title)},${course.isGE},false) on conflict (source_key) do update set title=excluded.title,is_ge=excluded.is_ge;`);
for (const course of courses) for (const faculty of new Set(course.paths.map((item) => item.faculty))) lines.push(`insert into public.course_faculties(course_id,faculty_id) select c.id,f.id from public.courses c join public.faculties f on f.name=${quote(faculty)} where c.source_key=${quote(`moodle:${course.code}`)} on conflict do nothing;`);
for (const course of courses) for (const { faculty, branch } of course.paths) if (!branch.includes('หมวดคณะโดยตรง')) lines.push(`insert into public.course_programs(course_id,program_id) select c.id,p.id from public.courses c join public.programs p on p.name=${quote(branch)} join public.faculties f on f.id=p.faculty_id and f.name=${quote(faculty)} where c.source_key=${quote(`moodle:${course.code}`)} on conflict do nothing;`);
lines.push('commit;');
const target = path.join(root, 'supabase', 'seed.sql');
fs.writeFileSync(target, lines.join('\n') + '\n');
process.stdout.write(`Generated provisional seed: ${courses.length} courses, ${faculties.length} faculties, ${programs.size} branches\n`);
