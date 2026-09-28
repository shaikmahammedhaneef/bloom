// Built-in content: icons, colors, templates, challenges, workouts, prompts. Everything is free.
import type { ChallengeDef, Repeat } from "./types";

export const ICONS = [
  "drop", "book", "leaf", "dumbbell", "moon", "sun", "pen", "broom", "heart", "target",
  "wind", "food", "steps", "bed", "phone", "work", "music", "sparkle", "bolt", "people",
];

export const TONES = [
  { key: "sky", name: "Sky" },
  { key: "sage", name: "Sage" },
  { key: "peach", name: "Peach" },
  { key: "lilac", name: "Lilac" },
  { key: "honey", name: "Honey" },
  { key: "rose", name: "Rose" },
];

export const CATEGORIES = [
  { key: "health", name: "Health", icon: "heart" },
  { key: "mind", name: "Mind", icon: "leaf" },
  { key: "chores", name: "Chores", icon: "broom" },
  { key: "work", name: "Work", icon: "work" },
  { key: "other", name: "Other", icon: "sparkle" },
];

export const ACCENTS = [
  { key: "sage", name: "Sage", hex: "#2E6B5A" },
  { key: "peach", name: "Peach", hex: "#B5552E" },
  { key: "lilac", name: "Lilac", hex: "#5B4E9A" },
  { key: "ocean", name: "Ocean", hex: "#1F5E8C" },
];

export const GOALS = [
  { key: "sleep", name: "Better sleep", icon: "moon" },
  { key: "energy", name: "More energy", icon: "bolt" },
  { key: "stress", name: "Less stress", icon: "leaf" },
  { key: "fitness", name: "Get fit", icon: "dumbbell" },
  { key: "focus", name: "Sharper focus", icon: "target" },
  { key: "selflove", name: "Self-love", icon: "heart" },
];

export const RECHARGE = ["Quiet time alone", "Being with people", "A mix of both"];

export interface TemplateHabit {
  name: string;
  icon: string;
  color: string;
  category: string;
  startTime: string;
  endTime: string;
  repeat: Repeat;
  timesPerWeek?: number;
  days?: number[];
  goal?: number;
  unit?: string;
}

export interface Template {
  key: string;
  name: string;
  desc: string;
  icon: string;
  tone: string;
  tags: string[];
  kind: string;
  habits: TemplateHabit[];
}

const h = (
  name: string, icon: string, color: string, category: string, startTime: string, endTime: string,
  extra: Partial<TemplateHabit> = {}
): TemplateHabit => ({ name, icon, color, category, startTime, endTime, repeat: "daily", ...extra });

export const TEMPLATES: Template[] = [
  {
    key: "morning-reset", name: "Morning reset", desc: "A calm, steady start before the day gets busy.",
    icon: "sun", tone: "honey", tags: ["sleep", "energy", "stress"], kind: "Morning",
    habits: [
      h("Drink a glass of water", "drop", "sky", "health", "06:30", "06:35"),
      h("Stretch", "leaf", "sage", "health", "06:35", "06:45"),
      h("Make your bed", "broom", "honey", "chores", "06:45", "06:50"),
      h("Plan the day", "pen", "lilac", "mind", "06:50", "07:00"),
      h("Journal three lines", "book", "lilac", "mind", "07:00", "07:05"),
    ],
  },
  {
    key: "afternoon-focus", name: "Afternoon focus", desc: "Protect your best hours for deep work.",
    icon: "target", tone: "lilac", tags: ["focus"], kind: "Study",
    habits: [
      h("Focus session", "target", "lilac", "work", "14:00", "14:25"),
      h("Walk break", "steps", "sage", "health", "14:25", "14:35"),
      h("Refill your water", "drop", "sky", "health", "15:00", "15:05"),
    ],
  },
  {
    key: "evening-wind-down", name: "Evening wind-down", desc: "Slow down so sleep comes easier.",
    icon: "moon", tone: "sky", tags: ["sleep", "stress"], kind: "Sleep",
    habits: [
      h("Read 20 pages", "book", "peach", "mind", "21:30", "22:00"),
      h("Screens off", "phone", "honey", "health", "22:00", "22:05"),
      h("Breathing, 3 minutes", "wind", "sage", "mind", "22:05", "22:10"),
      h("Three good things", "heart", "rose", "mind", "22:10", "22:15"),
      h("Lights out", "bed", "sky", "health", "22:30", "22:35"),
    ],
  },
  {
    key: "early-riser", name: "Early riser", desc: "Wake up early and get moving.",
    icon: "bolt", tone: "honey", tags: ["energy", "fitness"], kind: "Morning",
    habits: [
      h("Wake up", "sun", "honey", "health", "06:00", "06:10"),
      h("Morning walk", "steps", "sage", "health", "06:15", "06:45"),
      h("Healthy breakfast", "food", "peach", "health", "07:00", "07:20"),
    ],
  },
  {
    key: "student-focus", name: "Student focus day", desc: "Study blocks with breaks built in.",
    icon: "book", tone: "lilac", tags: ["focus"], kind: "Study",
    habits: [
      h("Review notes", "book", "lilac", "work", "08:00", "08:30"),
      h("Deep study block", "target", "lilac", "work", "09:00", "11:00"),
      h("Second study block", "target", "lilac", "work", "14:00", "16:00"),
      h("Plan tomorrow", "pen", "sage", "work", "21:00", "21:15"),
    ],
  },
  {
    key: "hydration", name: "Hydration boost", desc: "Spread 8 glasses across your day.",
    icon: "drop", tone: "sky", tags: ["energy", "fitness"], kind: "Health",
    habits: [h("Drink water", "drop", "sky", "health", "09:00", "21:00", { goal: 8, unit: "glasses" })],
  },
  {
    key: "sunday-reset", name: "Sunday reset", desc: "Clear the decks for the week ahead.",
    icon: "broom", tone: "honey", tags: ["stress"], kind: "Chores",
    habits: [
      h("Laundry", "broom", "honey", "chores", "10:00", "11:00", { repeat: "days", days: [0] }),
      h("Clean the kitchen", "broom", "honey", "chores", "11:00", "11:30", { repeat: "days", days: [0] }),
      h("Tidy your room", "broom", "honey", "chores", "11:30", "12:00", { repeat: "days", days: [0] }),
      h("Meal prep", "food", "peach", "chores", "16:00", "17:00", { repeat: "days", days: [0] }),
      h("Weekly review", "pen", "lilac", "mind", "19:00", "19:30", { repeat: "days", days: [0] }),
    ],
  },
  {
    key: "strength-starter", name: "Strength starter", desc: "Three short strength sessions a week.",
    icon: "dumbbell", tone: "peach", tags: ["fitness", "energy"], kind: "Fitness",
    habits: [
      h("Strength workout", "dumbbell", "peach", "health", "18:00", "18:45", { repeat: "days", days: [1, 3, 5] }),
      h("Protein-rich dinner", "food", "sage", "health", "19:30", "20:00", { repeat: "days", days: [1, 3, 5] }),
    ],
  },
  {
    key: "mindful-day", name: "Mindful day", desc: "Small pauses that lower stress.",
    icon: "wind", tone: "sage", tags: ["stress", "selflove"], kind: "Self-care",
    habits: [
      h("Meditate", "wind", "lilac", "mind", "07:15", "07:25"),
      h("Mindful lunch", "food", "peach", "mind", "13:00", "13:30"),
      h("Evening walk", "steps", "sage", "health", "18:30", "19:00"),
    ],
  },
  {
    key: "self-love", name: "Self-love basics", desc: "Kind habits that are just for you.",
    icon: "heart", tone: "rose", tags: ["selflove"], kind: "Self-care",
    habits: [
      h("Affirmations", "sparkle", "rose", "mind", "07:00", "07:05"),
      h("Do something you enjoy", "music", "peach", "mind", "17:00", "17:30"),
      h("Skincare", "heart", "rose", "health", "21:45", "22:00"),
    ],
  },
];

export const TEMPLATE_KINDS = ["All", "Morning", "Study", "Sleep", "Health", "Fitness", "Chores", "Self-care"];

export function suggestTemplates(goals: string[]): string[] {
  const picked: string[] = [];
  for (const g of goals) {
    for (const t of TEMPLATES) {
      if (t.tags.includes(g) && !picked.includes(t.key)) {
        picked.push(t.key);
        break;
      }
    }
  }
  if (!picked.length) picked.push("morning-reset", "evening-wind-down");
  return picked.slice(0, 3);
}

export const CHALLENGES: ChallengeDef[] = [
  { key: "digital-detox", name: "Digital detox", desc: "Give your evenings back.", task: "Screens off by 9:00 PM", icon: "phone", tone: "honey", days: 7 },
  { key: "early-riser", name: "Early riser", desc: "Build a steady wake-up time.", task: "Get up by 6:30 AM", icon: "sun", tone: "honey", days: 7 },
  { key: "hydration-7", name: "7-day hydration", desc: "Make water automatic.", task: "Drink 8 glasses of water", icon: "drop", tone: "sky", days: 7 },
  { key: "no-sugar", name: "No added sugar", desc: "A week without sweet drinks and snacks.", task: "Skip added sugar", icon: "food", tone: "peach", days: 7 },
  { key: "hydration-21", name: "21-day hydration", desc: "Three weeks to lock it in.", task: "Drink 8 glasses of water", icon: "drop", tone: "sky", days: 21 },
  { key: "gratitude-21", name: "Gratitude streak", desc: "Notice what went well.", task: "Write three good things", icon: "heart", tone: "rose", days: 21 },
  { key: "move-21", name: "Move every day", desc: "Any movement counts.", task: "20 active minutes", icon: "dumbbell", tone: "sage", days: 21 },
  { key: "reading-21", name: "Reading habit", desc: "A few pages, every day.", task: "Read 10 pages", icon: "book", tone: "lilac", days: 21 },
];

export interface Workout {
  key: string;
  name: string;
  level: string;
  icon: string;
  tone: string;
  steps: { name: string; secs: number; rest?: boolean }[];
}

export const WORKOUTS: Workout[] = [
  {
    key: "morning-stretch", name: "Morning stretch", level: "Easy", icon: "sun", tone: "peach",
    steps: [
      { name: "Neck rolls", secs: 45 }, { name: "Shoulder circles", secs: 45 }, { name: "Cat-cow", secs: 60 },
      { name: "Forward fold", secs: 45 }, { name: "Hip opener, left", secs: 60 }, { name: "Hip opener, right", secs: 60 },
      { name: "Child’s pose", secs: 60 },
    ],
  },
  {
    key: "hiit-7", name: "7-minute workout", level: "Medium", icon: "bolt", tone: "honey",
    steps: [
      { name: "Jumping jacks", secs: 30 }, { name: "Rest", secs: 10, rest: true }, { name: "Wall sit", secs: 30 },
      { name: "Rest", secs: 10, rest: true }, { name: "Push-ups", secs: 30 }, { name: "Rest", secs: 10, rest: true },
      { name: "Crunches", secs: 30 }, { name: "Rest", secs: 10, rest: true }, { name: "Step-ups", secs: 30 },
      { name: "Rest", secs: 10, rest: true }, { name: "Squats", secs: 30 }, { name: "Rest", secs: 10, rest: true },
      { name: "Plank", secs: 30 }, { name: "Rest", secs: 10, rest: true }, { name: "High knees", secs: 30 },
      { name: "Rest", secs: 10, rest: true }, { name: "Lunges", secs: 30 }, { name: "Rest", secs: 10, rest: true },
      { name: "Side plank", secs: 30 },
    ],
  },
  {
    key: "yoga-sleep", name: "Yoga for sleep", level: "Easy", icon: "moon", tone: "sky",
    steps: [
      { name: "Seated breathing", secs: 90 }, { name: "Butterfly pose", secs: 90 }, { name: "Seated forward fold", secs: 90 },
      { name: "Supine twist, left", secs: 60 }, { name: "Supine twist, right", secs: 60 },
      { name: "Legs up the wall", secs: 180 }, { name: "Resting pose", secs: 180 },
    ],
  },
  {
    key: "desk-break", name: "Desk break", level: "Easy", icon: "work", tone: "sage",
    steps: [
      { name: "Stand and reach up", secs: 30 }, { name: "Neck stretch", secs: 45 }, { name: "Chest opener", secs: 45 },
      { name: "Wrist stretch", secs: 30 }, { name: "Seated twist", secs: 60 }, { name: "Calf raises", secs: 45 },
    ],
  },
];

export const PROMPTS = [
  "What drained your energy today, and what gave some of it back?",
  "What is one small thing you did well today?",
  "What are you avoiding right now, and what’s the smallest first step?",
  "When did you feel most like yourself today?",
  "What would make tomorrow feel a little easier?",
  "What’s taking up space in your head right now?",
  "Who made your day better, and did you tell them?",
  "What did your body need today? Did it get it?",
  "What are you looking forward to this week?",
  "What would you tell a friend who had your day?",
  "What’s one thing you can let go of tonight?",
  "Which habit felt easiest today? Why?",
  "What surprised you today?",
  "What are you proud of this week?",
];

export const EMOTIONS = ["Calm", "Grateful", "Hopeful", "Happy", "Motivated", "Proud", "Tired", "Anxious", "Stressed", "Sad", "Lonely", "Irritated"];

export const TRIGGERS = [
  { key: "Sleep", icon: "bed" }, { key: "Work", icon: "work" }, { key: "Family", icon: "people" },
  { key: "Friends", icon: "heart" }, { key: "Exercise", icon: "dumbbell" }, { key: "Food", icon: "food" },
  { key: "Weather", icon: "cloud" }, { key: "Health", icon: "pulse" },
];

export const MOOD_NAMES = ["Awful", "Low", "Okay", "Good", "Great"];

export const LEVEL_NAMES = ["Seedling", "Sprout", "Steady sprout", "Budding", "Blooming", "Flourishing", "Evergreen", "Wildflower", "Sunflower", "Great oak"];

export function promptFor(dateKey: string, offset = 0): string {
  const n = dateKey.split("-").reduce((a, b) => a + Number(b), 0) + offset;
  return PROMPTS[((n % PROMPTS.length) + PROMPTS.length) % PROMPTS.length];
}
