package app.bloom.data

// Built-in content, the same as the web app's lib/catalog.ts. Everything is free.

data class Tone(val key: String, val name: String)
data class Category(val key: String, val name: String, val icon: String)
data class Goal(val key: String, val name: String, val icon: String)
data class TemplateHabit(
    val name: String, val icon: String, val color: String, val category: String,
    val startTime: String, val endTime: String, val repeat: String = "daily",
    val days: List<Int> = emptyList(), val goal: Int = 1, val unit: String = "",
)
data class Template(
    val key: String, val name: String, val desc: String, val icon: String, val tone: String,
    val tags: List<String>, val kind: String, val habits: List<TemplateHabit>,
)
data class ChallengeDef(val key: String, val name: String, val desc: String, val task: String, val icon: String, val tone: String, val days: Int)

object Catalog {
    val ICONS = listOf(
        "drop", "book", "leaf", "dumbbell", "moon", "sun", "pen", "broom", "heart", "target",
        "wind", "food", "steps", "bed", "phone", "work", "music", "sparkle", "bolt", "people",
    )
    val TONES = listOf(Tone("sky", "Sky"), Tone("sage", "Sage"), Tone("peach", "Peach"), Tone("lilac", "Lilac"), Tone("honey", "Honey"), Tone("rose", "Rose"))
    val CATEGORIES = listOf(
        Category("health", "Health", "heart"), Category("mind", "Mind", "leaf"), Category("chores", "Chores", "broom"),
        Category("work", "Work", "work"), Category("other", "Other", "sparkle"),
    )
    val ACCENTS = listOf("sage" to "Sage", "peach" to "Peach", "lilac" to "Lilac", "ocean" to "Ocean")
    val GOALS = listOf(
        Goal("sleep", "Better sleep", "moon"), Goal("energy", "More energy", "bolt"), Goal("stress", "Less stress", "leaf"),
        Goal("fitness", "Get fit", "dumbbell"), Goal("focus", "Sharper focus", "target"), Goal("selflove", "Self-love", "heart"),
    )
    val RECHARGE = listOf("Quiet time alone", "Being with people", "A mix of both")

    private fun h(name: String, icon: String, color: String, category: String, s: String, e: String, repeat: String = "daily", days: List<Int> = emptyList(), goal: Int = 1, unit: String = "") =
        TemplateHabit(name, icon, color, category, s, e, repeat, days, goal, unit)

    val TEMPLATES = listOf(
        Template("morning-reset", "Morning reset", "A calm, steady start before the day gets busy.", "sun", "honey", listOf("sleep", "energy", "stress"), "Morning", listOf(
            h("Drink a glass of water", "drop", "sky", "health", "06:30", "06:35"),
            h("Stretch", "leaf", "sage", "health", "06:35", "06:45"),
            h("Make your bed", "broom", "honey", "chores", "06:45", "06:50"),
            h("Plan the day", "pen", "lilac", "mind", "06:50", "07:00"),
            h("Journal three lines", "book", "lilac", "mind", "07:00", "07:05"),
        )),
        Template("afternoon-focus", "Afternoon focus", "Protect your best hours for deep work.", "target", "lilac", listOf("focus"), "Study", listOf(
            h("Focus session", "target", "lilac", "work", "14:00", "14:25"),
            h("Walk break", "steps", "sage", "health", "14:25", "14:35"),
            h("Refill your water", "drop", "sky", "health", "15:00", "15:05"),
        )),
        Template("evening-wind-down", "Evening wind-down", "Slow down so sleep comes easier.", "moon", "sky", listOf("sleep", "stress"), "Sleep", listOf(
            h("Read 20 pages", "book", "peach", "mind", "21:30", "22:00"),
            h("Screens off", "phone", "honey", "health", "22:00", "22:05"),
            h("Breathing, 3 minutes", "wind", "sage", "mind", "22:05", "22:10"),
            h("Three good things", "heart", "rose", "mind", "22:10", "22:15"),
            h("Lights out", "bed", "sky", "health", "22:30", "22:35"),
        )),
        Template("early-riser", "Early riser", "Wake up early and get moving.", "bolt", "honey", listOf("energy", "fitness"), "Morning", listOf(
            h("Wake up", "sun", "honey", "health", "06:00", "06:10"),
            h("Morning walk", "steps", "sage", "health", "06:15", "06:45"),
            h("Healthy breakfast", "food", "peach", "health", "07:00", "07:20"),
        )),
        Template("student-focus", "Student focus day", "Study blocks with breaks built in.", "book", "lilac", listOf("focus"), "Study", listOf(
            h("Review notes", "book", "lilac", "work", "08:00", "08:30"),
            h("Deep study block", "target", "lilac", "work", "09:00", "11:00"),
            h("Second study block", "target", "lilac", "work", "14:00", "16:00"),
            h("Plan tomorrow", "pen", "sage", "work", "21:00", "21:15"),
        )),
        Template("hydration", "Hydration boost", "Spread 8 glasses across your day.", "drop", "sky", listOf("energy", "fitness"), "Health", listOf(
            h("Drink water", "drop", "sky", "health", "09:00", "21:00", goal = 8, unit = "glasses"),
        )),
        Template("sunday-reset", "Sunday reset", "Clear the decks for the week ahead.", "broom", "honey", listOf("stress"), "Chores", listOf(
            h("Laundry", "broom", "honey", "chores", "10:00", "11:00", "days", listOf(0)),
            h("Clean the kitchen", "broom", "honey", "chores", "11:00", "11:30", "days", listOf(0)),
            h("Tidy your room", "broom", "honey", "chores", "11:30", "12:00", "days", listOf(0)),
            h("Meal prep", "food", "peach", "chores", "16:00", "17:00", "days", listOf(0)),
            h("Weekly review", "pen", "lilac", "mind", "19:00", "19:30", "days", listOf(0)),
        )),
        Template("strength-starter", "Strength starter", "Three short strength sessions a week.", "dumbbell", "peach", listOf("fitness", "energy"), "Fitness", listOf(
            h("Strength workout", "dumbbell", "peach", "health", "18:00", "18:45", "days", listOf(1, 3, 5)),
            h("Protein-rich dinner", "food", "sage", "health", "19:30", "20:00", "days", listOf(1, 3, 5)),
        )),
        Template("mindful-day", "Mindful day", "Small pauses that lower stress.", "wind", "sage", listOf("stress", "selflove"), "Self-care", listOf(
            h("Meditate", "wind", "lilac", "mind", "07:15", "07:25"),
            h("Mindful lunch", "food", "peach", "mind", "13:00", "13:30"),
            h("Evening walk", "steps", "sage", "health", "18:30", "19:00"),
        )),
        Template("self-love", "Self-love basics", "Kind habits that are just for you.", "heart", "rose", listOf("selflove"), "Self-care", listOf(
            h("Affirmations", "sparkle", "rose", "mind", "07:00", "07:05"),
            h("Do something you enjoy", "music", "peach", "mind", "17:00", "17:30"),
            h("Skincare", "heart", "rose", "health", "21:45", "22:00"),
        )),
    )

    fun suggestTemplates(goals: List<String>): List<String> {
        val picked = mutableListOf<String>()
        for (g in goals) TEMPLATES.firstOrNull { g in it.tags && it.key !in picked }?.let { picked += it.key }
        if (picked.isEmpty()) picked += listOf("morning-reset", "evening-wind-down")
        return picked.take(3)
    }

    val CHALLENGES = listOf(
        ChallengeDef("digital-detox", "Digital detox", "Give your evenings back.", "Screens off by 9:00 PM", "phone", "honey", 7),
        ChallengeDef("early-riser", "Early riser", "Build a steady wake-up time.", "Get up by 6:30 AM", "sun", "honey", 7),
        ChallengeDef("hydration-7", "7-day hydration", "Make water automatic.", "Drink 8 glasses of water", "drop", "sky", 7),
        ChallengeDef("no-sugar", "No added sugar", "A week without sweet drinks and snacks.", "Skip added sugar", "food", "peach", 7),
        ChallengeDef("hydration-21", "21-day hydration", "Three weeks to lock it in.", "Drink 8 glasses of water", "drop", "sky", 21),
        ChallengeDef("gratitude-21", "Gratitude streak", "Notice what went well.", "Write three good things", "heart", "rose", 21),
        ChallengeDef("move-21", "Move every day", "Any movement counts.", "20 active minutes", "dumbbell", "sage", 21),
        ChallengeDef("reading-21", "Reading habit", "A few pages, every day.", "Read 10 pages", "book", "lilac", 21),
    )

    val PROMPTS = listOf(
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
    )

    fun promptFor(dateKey: String, offset: Int = 0): String {
        val n = dateKey.split("-").sumOf { it.toInt() } + offset
        return PROMPTS[((n % PROMPTS.size) + PROMPTS.size) % PROMPTS.size]
    }

    val EMOTIONS = listOf("Calm", "Grateful", "Hopeful", "Happy", "Motivated", "Proud", "Tired", "Anxious", "Stressed", "Sad", "Lonely", "Irritated")
    val TRIGGERS = listOf("Sleep" to "bed", "Work" to "work", "Family" to "people", "Friends" to "heart", "Exercise" to "dumbbell", "Food" to "food", "Weather" to "cloud", "Health" to "pulse")
    val MOOD_NAMES = listOf("Awful", "Low", "Okay", "Good", "Great")
    val MOOD_EMOJI = listOf("😣", "😕", "😐", "🙂", "😄")
    val LEVEL_NAMES = listOf("Seedling", "Sprout", "Steady sprout", "Budding", "Blooming", "Flourishing", "Evergreen", "Wildflower", "Sunflower", "Great oak")

    data class Breath(val key: String, val name: String, val desc: String, val phases: List<Pair<String, Int>>)
    val BREATHS = listOf(
        Breath("box", "Box breathing", "Steady and calming. 4 counts each.", listOf("Breathe in" to 4, "Hold" to 4, "Breathe out" to 4, "Hold" to 4)),
        Breath("478", "4-7-8", "Helps you fall asleep.", listOf("Breathe in" to 4, "Hold" to 7, "Breathe out" to 8)),
        Breath("calm", "Calm breath", "Longer out-breaths slow you down.", listOf("Breathe in" to 4, "Breathe out" to 6)),
    )
}
