import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const lines = fs.readFileSync(path.join(root, 'hcu-course-catalog.md'), 'utf8').split(/\r?\n/);
const courses = new Map();
const normalize = (text) => text.replace(/\s+/g, '').toUpperCase();

for (const line of lines) {
  if (!line.startsWith('|')) continue;
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
  if (cells.length !== 4 || !/^[A-Z]{2,}\s*\d+[A-Z0-9]*$/i.test(cells[0])) continue;
  const [rawCode, title, faculty, branch] = cells;
  const code = normalize(rawCode);
  const existing = courses.get(code);
  const facultyNames = faculty.split(';').map((value) => value.trim()).filter(Boolean);
  const branchNames = branch.split(';').map((value) => value.trim()).filter(Boolean);
  const paths = facultyNames.flatMap((facultyName) => branchNames.map((branchName) => ({ faculty: facultyName, branch: branchName })));
  if (existing) {
    if (existing.title === 'ชื่อไม่ระบุใน Moodle' && title !== existing.title) existing.title = title;
    for (const path of paths) {
      if (!existing.paths.some((item) => item.faculty === path.faculty && item.branch === path.branch)) existing.paths.push(path);
    }
  } else {
    courses.set(code, { code, title, isGE: code.startsWith('GE'), paths });
  }
}

const output = [...courses.values()].sort((a, b) => a.code.localeCompare(b.code, 'en'));
const target = path.join(root, 'src', 'data', 'courses.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(output, null, 2) + '\n');
process.stdout.write(`Generated ${output.length} courses from HCU catalog\n`);
