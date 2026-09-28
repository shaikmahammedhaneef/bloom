export type Repeat = "daily" | "weekly" | "days";

export interface Habit {
  _id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  startTime: string;
  endTime: string;
  repeat: Repeat;
  timesPerWeek: number;
  days: number[];
  goal: number;
  unit: string;
  reminder: boolean;
  startDate: string;
}

export interface HabitToday extends Habit {
  count: number;
  done: boolean;
  scheduled: boolean;
  streak: number;
  best: number;
  streakUnit: "day" | "week";
  weekDone: number;
}

export interface Todo {
  _id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  done: boolean;
  reminder: boolean;
  repeat: TodoRepeat;
  days: number[];
  startDate: string; // first day (differs from `date` for repeating and multi-day to-dos)
  endDate: string; // last day, or "" for none
}

export type TodoRepeat = "none" | "daily" | "days";

export interface Mood {
  _id?: string;
  date: string;
  level: number;
  emotions: string[];
  triggers: string[];
  note: string;
  time: string;
}

export interface JournalEntry {
  _id?: string;
  date: string;
  prompt: string;
  text: string;
  gratitude: string[];
}

export interface Settings {
  accent: string;
  dark: boolean;
  waterGoal: number;
  stepGoal: number;
  reminders: { routine: boolean; mood: boolean; moodTime: string; streak: boolean };
}

export interface Me {
  _id: string;
  email: string;
  name: string;
  onboarded: boolean;
  goals: string[];
  recharge: string;
  roleModel: string;
  settings: Settings;
}

export interface TodayData {
  date: string;
  habits: HabitToday[];
  todos: Todo[];
  mood: Mood | null; // the day's best check-in
  moodCount: number;
  points: number;
}

export interface Badge {
  key: string;
  name: string;
  desc: string;
  icon: string;
  earned: boolean;
}

export interface StatsData {
  range: "week" | "month";
  from: string;
  to: string;
  days: { date: string; pct: number | null }[];
  avgCompletion: number | null;
  habitsDone: number;
  avgMood: number | null;
  moodSeries: { date: string; level: number }[];
  insights: string[];
  points: number;
  level: number;
  levelName: string;
  levelStart: number;
  levelNext: number;
  nextName: string;
  badges: Badge[];
  breakdown: { label: string; count: number; each: number }[];
}

export interface ChallengeDef {
  key: string;
  name: string;
  desc: string;
  task: string;
  icon: string;
  tone: string;
  days: number;
}

export interface ChallengeView {
  _id: string;
  key: string;
  name: string;
  task: string;
  icon: string;
  tone: string;
  days: number;
  startDate: string;
  day: number;
  doneDates: string[];
  doneToday: boolean;
  status: "active" | "completed" | "ended";
}

export interface HealthDay {
  date: string;
  water: number;
  steps: number;
  weight: number | null;
  sleepStart: string;
  sleepEnd: string;
}
