import mongoose, { Schema, type Model } from "mongoose";

const { ObjectId } = Schema.Types;
const opts = { timestamps: true };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function make(name: string, schema: Schema): Model<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mongoose.models[name] as Model<any>) || mongoose.model(name, schema);
}

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    onboarded: { type: Boolean, default: false },
    goals: { type: [String], default: [] },
    recharge: { type: String, default: "" },
    roleModel: { type: String, default: "" },
    settings: {
      accent: { type: String, default: "sage" },
      dark: { type: Boolean, default: false },
      waterGoal: { type: Number, default: 8 },
      stepGoal: { type: Number, default: 8000 },
      reminders: {
        routine: { type: Boolean, default: true },
        mood: { type: Boolean, default: true },
        moodTime: { type: String, default: "21:00" },
        streak: { type: Boolean, default: true },
      },
    },
  },
  opts
);

const HabitSchema = new Schema(
  {
    userId: { type: ObjectId, required: true, index: true },
    name: { type: String, required: true },
    icon: { type: String, default: "check" },
    color: { type: String, default: "sage" },
    category: { type: String, default: "health" },
    startTime: { type: String, default: "" }, // "from" time, HH:mm
    endTime: { type: String, default: "" }, // "to" time, HH:mm
    repeat: { type: String, enum: ["daily", "weekly", "days"], default: "daily" },
    timesPerWeek: { type: Number, default: 3 },
    days: { type: [Number], default: [] }, // 0 = Sunday … 6 = Saturday
    goal: { type: Number, default: 1 },
    unit: { type: String, default: "" },
    reminder: { type: Boolean, default: false },
    startDate: { type: String, default: "" },
  },
  opts
);

const HabitLogSchema = new Schema(
  {
    userId: { type: ObjectId, required: true },
    habitId: { type: ObjectId, required: true },
    date: { type: String, required: true },
    count: { type: Number, default: 0 },
  },
  opts
);
HabitLogSchema.index({ habitId: 1, date: 1 }, { unique: true });
HabitLogSchema.index({ userId: 1, date: 1 });

const TodoSchema = new Schema(
  {
    userId: { type: ObjectId, required: true },
    title: { type: String, required: true },
    date: { type: String, required: true }, // the day, or the first day of a repeating to-do
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    done: { type: Boolean, default: false }, // one-off to-dos only
    reminder: { type: Boolean, default: false },
    repeat: { type: String, enum: ["none", "daily", "days"], default: "none" },
    days: { type: [Number], default: [] }, // 0 = Sunday … 6 = Saturday, for repeat "days"
    doneDates: { type: [String], default: [] }, // days a repeating to-do was done
    skipDates: { type: [String], default: [] }, // days removed from a repeating to-do
  },
  opts
);
TodoSchema.index({ userId: 1, date: 1 });

// Browsers subscribed to Web Push, so reminders arrive while Bloom is closed.
const PushSubSchema = new Schema(
  {
    userId: { type: ObjectId, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
    tz: { type: String, default: "UTC" },
  },
  opts
);

// One row per reminder already sent, so each goes out once. Expires after 3 days.
const ReminderSentSchema = new Schema({
  key: { type: String, required: true, unique: true },
  at: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 3 },
});

const MoodSchema = new Schema(
  {
    userId: { type: ObjectId, required: true },
    date: { type: String, required: true },
    level: { type: Number, min: 1, max: 5, required: true },
    emotions: { type: [String], default: [] },
    triggers: { type: [String], default: [] },
    note: { type: String, default: "" },
  },
  opts
);
MoodSchema.index({ userId: 1, date: 1 }, { unique: true });

const JournalSchema = new Schema(
  {
    userId: { type: ObjectId, required: true },
    date: { type: String, required: true },
    prompt: { type: String, default: "" },
    text: { type: String, default: "" },
    gratitude: { type: [String], default: [] },
  },
  opts
);
JournalSchema.index({ userId: 1, date: 1 }, { unique: true });

const UserChallengeSchema = new Schema(
  {
    userId: { type: ObjectId, required: true, index: true },
    key: { type: String, required: true },
    startDate: { type: String, required: true },
    doneDates: { type: [String], default: [] },
    status: { type: String, enum: ["active", "completed", "ended", "left"], default: "active" },
  },
  opts
);

const HealthSchema = new Schema(
  {
    userId: { type: ObjectId, required: true },
    date: { type: String, required: true },
    water: { type: Number, default: 0 },
    steps: { type: Number, default: 0 },
    weight: { type: Number, default: null },
    sleepStart: { type: String, default: "" },
    sleepEnd: { type: String, default: "" },
  },
  opts
);
HealthSchema.index({ userId: 1, date: 1 }, { unique: true });

const SessionSchema = new Schema(
  {
    userId: { type: ObjectId, required: true, index: true },
    date: { type: String, required: true },
    type: { type: String, enum: ["breathe", "focus", "workout"], required: true },
    minutes: { type: Number, default: 0 },
    label: { type: String, default: "" },
  },
  opts
);

export const User = make("User", UserSchema);
export const Habit = make("Habit", HabitSchema);
export const HabitLog = make("HabitLog", HabitLogSchema);
export const Todo = make("Todo", TodoSchema);
export const PushSub = make("PushSub", PushSubSchema);
export const ReminderSent = make("ReminderSent", ReminderSentSchema);
export const Mood = make("Mood", MoodSchema);
export const Journal = make("Journal", JournalSchema);
export const UserChallenge = make("UserChallenge", UserChallengeSchema);
export const Health = make("Health", HealthSchema);
export const Session = make("Session", SessionSchema);
