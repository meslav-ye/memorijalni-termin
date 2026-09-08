/**
 * One-shot: rebuild Elo + contribution for every finished game.
 *
 *   node --env-file=.env.local --import tsx scripts/replay-ratings.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { replayAllRatings } from "../lib/data/replay-ratings";

async function main() {
  const result = await replayAllRatings();
  console.log(`Replayed ${result.games} finished game(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
