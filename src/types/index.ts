export type Company = 'Alpha' | 'Bravo' | 'Charlie' | 'Ranger' | 'Master';

export type AttendanceStatus = 'present' | 'excused' | 'unexcused' | null;

export type DayOfWeek = 'tuesday' | 'wednesday' | 'thursday';

export interface Cadet {
  id: string;
  company: Company;
  firstName: string;
  lastName: string;
  age?: number;
  position?: string;
  militaryScienceLevel: string; // e.g., "MS1", "MS2", "MS3", "MS4"
  phoneNumber: string;
  email: string;
}

export interface AttendanceRecord {
  cadetId: string;
  tuesday: AttendanceStatus;
  wednesday: AttendanceStatus;
  thursday: AttendanceStatus;
  weekStartDate: string; // ISO date string for the Monday of the week
}

export interface WeekStats {
  present: number;
  excused: number;
  unexcused: number;
}

export interface DayStats {
  present: number;
  excused: number;
  unexcused: number;
}

