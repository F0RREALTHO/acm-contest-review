import { redirect } from "next/navigation";

// All slug-based URLs redirect back to the slug-free public page.
// This means: whether the slug exists or not, visitors can never
// confirm or deny they guessed a valid contest slug.
export default async function PublicLeaderboardSlugPage() {
  redirect("/public/leaderboard");
}
