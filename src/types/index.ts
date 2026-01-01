export type Company = 'Alpha' | 'Bravo' | 'Charlie' | 'Ranger' | 'Master';

export type AttendanceStatus = 'present' | 'excused' | 'unexcused' | null;

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
export type AttendanceType = 'PT' | 'Lab' | 'Tactics';

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
  contracted?: 'Y' | 'N';
  profilePicture?: string;
}

export interface AttendanceRecord {
  cadetId: string;
  // PT (Physical Training) - Monday, Tuesday, Wednesday, Thursday, Friday
  // Monday and Friday are only used for Ranger Company
  ptMonday?: AttendanceStatus;
  ptTuesday: AttendanceStatus;
  ptWednesday: AttendanceStatus;
  ptThursday: AttendanceStatus;
  ptFriday?: AttendanceStatus;
  // Lab - Thursday only
  labThursday: AttendanceStatus;
  // Tactics - Tuesday only (for MS3s)
  tacticsTuesday?: AttendanceStatus;
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

export type PlanningStatus = 'complete' | 'in-progress' | 'issues' | 'not-started';

export interface TrainingEvent {
  id: string;
  name: string;
  date: string; // ISO date string
  oicId?: string; // Cadet ID
  ncoicId?: string; // Cadet ID
  ao?: string; // Area of Operations
  uniform?: string;
  mission?: string;
  planningStatus: PlanningStatus;
  conop?: ConopData;
}

export interface ConopData {
  imageUrl?: string; // URL for the AO image
  purpose?: string;
  mission?: string;
  situation?: {
    oic?: string;
    ncoic?: string;
    date?: string;
    ao?: string;
    uniform?: string;
  };
  endState?: string;
  conceptOfOperation?: {
    phase1?: string;
    phase1Label?: string; // e.g., "Location Prep"
    phase2?: string;
    phase2Label?: string; // e.g., "Arrival"
    phase3?: string;
    phase3Label?: string; // e.g., "Mentorship"
    phase4?: string;
    phase4Label?: string; // e.g., "Dismissal"
  };
  resources?: {
    class1?: string;
    class2?: string;
    class5?: string;
    class6?: string;
    class8?: string;
  };
  keyDates?: string[];
  attachedAppendices?: {
    appendix1?: string;
    appendix2?: string;
    appendix3?: string;
  };
  staffDuties?: {
    s1?: string;
    s2?: string;
    s3?: string;
    s4?: string;
    s5?: string;
    s6?: string;
  };
  commsPace?: {
    primary?: string;
    alternate?: string;
    contingency?: string;
    emergency?: string;
  };
  tasksToSubs?: string;
  resourceStatus?: {
    missionGear?: PlanningStatus;
    finance?: PlanningStatus;
    riskAssessment?: PlanningStatus;
  };
  weeklyTasks?: {
    t6?: { status?: PlanningStatus; description?: string };
    t5?: { status?: PlanningStatus; description?: string };
    t4?: { status?: PlanningStatus; description?: string };
    t3?: { status?: PlanningStatus; description?: string };
    t2?: { status?: PlanningStatus; description?: string };
    t1?: { status?: PlanningStatus; description?: string };
    tWeek?: { status?: PlanningStatus; description?: string };
  };
}

export interface PTPlan {
  id: string;
  company?: Company; // Optional for generic plans
  weekStartDate?: string; // ISO date string for the Monday of the week, optional for generic plans
  day?: DayOfWeek; // 'tuesday' | 'wednesday' | 'thursday', optional for generic plans
  title: string; // Workout title
  firstFormation: string; // Default "0600"
  workouts: string; // Actual workout description
  location: string;
  isGeneric?: boolean; // Flag to indicate if this is a generic plan (not tied to specific company/date)
}

