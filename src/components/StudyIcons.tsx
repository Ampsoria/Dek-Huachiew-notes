type StudyIconProps = { size?: number; className?: string };

export function GeneralEducationIcon({ size = 44, className }: StudyIconProps) {
  return <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M10 31c8-3 15-2 22 2 7-4 14-5 22-2v19c-8-3-15-2-22 2-7-4-14-5-22-2V31Z" fill="#FFF9E9" stroke="currentColor" strokeWidth="3.2" strokeLinejoin="round" />
    <path d="M32 33v19" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    <path d="m23 9 2.7 7.3L33 19l-7.3 2.7L23 29l-2.7-7.3L13 19l7.3-2.7L23 9Z" fill="#FFCB05" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" />
    <path d="M48 11v8m-4-4h8" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    <circle cx="49" cy="24" r="2" fill="currentColor" />
  </svg>;
}

export function FacultyIcon({ size = 44, className }: StudyIconProps) {
  return <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M9 25 32 12l23 13v4H9v-4Z" fill="#FFCB05" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M14 29v22h36V29" fill="#FFF9E9" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M22 35v11m10-11v11m10-11v11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M9 52h46" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
    <circle cx="32" cy="23" r="2.5" fill="currentColor" />
  </svg>;
}

export function ProgramIcon({ size = 28, className }: StudyIconProps) {
  return <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M13 15h28a5 5 0 0 1 5 5v29H18a5 5 0 0 1-5-5V15Z" fill="#FFF9E9" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M13 42a6 6 0 0 1 6-6h27M20 24h15m-15 7h10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M46 25h7v25a4 4 0 0 1-4 4H22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m42 10 1.3 3.7L47 15l-3.7 1.3L42 20l-1.3-3.7L37 15l3.7-1.3L42 10Z" fill="#FFCB05" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>;
}
