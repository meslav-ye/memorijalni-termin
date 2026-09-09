import Link from "next/link";
import { isSeasonChipActive } from "@/lib/domain/season-chips";

type Season = { id: string; name: string };

type Props = {
  grupaId: string;
  /** Base path without query: `/grupe/${id}/ljestvica` or `.../statistika` */
  basePath: string;
  seasons: Season[];
  requestedSeason: string | null;
  latestSeasonId: string | null;
};

export function SeasonBar({
  grupaId: _grupaId,
  basePath,
  seasons,
  requestedSeason,
  latestSeasonId,
}: Props) {
  const chipClass = (active: boolean) =>
    "h-9 rounded-lg border px-3 text-sm font-medium leading-9 transition " +
    (active
      ? "border-marka bg-marka text-white"
      : "border-slate-300 bg-white text-slate-700");

  return (
    <div className="flex flex-wrap gap-2">
      {seasons.map((s) => {
        const active = isSeasonChipActive({
          chipId: s.id,
          requestedSeason,
          latestSeasonId,
        });
        return (
          <Link
            key={s.id}
            href={`${basePath}?sezona=${s.id}`}
            className={chipClass(active)}
            aria-current={active ? "page" : undefined}
          >
            {s.name}
          </Link>
        );
      })}
      <Link
        href={`${basePath}?sezona=sve`}
        className={chipClass(
          isSeasonChipActive({
            chipId: "sve",
            requestedSeason,
            latestSeasonId,
          }),
        )}
        aria-current={requestedSeason === "sve" ? "page" : undefined}
      >
        Sve vrijeme
      </Link>
    </div>
  );
}
