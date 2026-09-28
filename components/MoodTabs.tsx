import { SegLinks } from "./ui";

export default function MoodTabs({ current }: { current: string }) {
  return (
    <SegLinks
      current={current}
      items={[
        { href: "/mood", label: "Check in" },
        { href: "/mood/journal", label: "Journal" },
        { href: "/mood/history", label: "History" },
      ]}
    />
  );
}
