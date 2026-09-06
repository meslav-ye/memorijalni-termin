export type Ton = "malo" | "dovoljno" | "puno";

export type Popunjenost = {
  /** Tekst za korisnika, npr. "Fali još 3" ili "Igra se — još 2 mjesta". */
  oznaka: string;
  ton: Ton;
  /** Koliko jos ljudi treba da se sigurno igra. Nula kad je dosegnut minimum. */
  faliDoMin: number;
  /** Koliko jos mjesta ima do kvote. Nula kad je popunjeno. */
  slobodnoMjesta: number;
};

/** Hrvatska jednina/mnozina za mjesta: 1 mjesto, 2 mjesta. */
function mjesta(n: number): string {
  return n === 1 ? "1 mjesto" : `${n} mjesta`;
}

/**
 * Stanje popunjenosti termina, iz dva praga.
 *
 *   min   = dovoljno da se sigurno igra (5v5 bez zamjena)
 *   kvota = najvise mjesta (sa zamjenama); preko toga ide lista cekanja
 */
export function popunjenost(prijavljenih: number, min: number, kvota: number): Popunjenost {
  const faliDoMin = Math.max(0, min - prijavljenih);
  const slobodnoMjesta = Math.max(0, kvota - prijavljenih);

  if (slobodnoMjesta === 0) {
    return { oznaka: "Popunjeno", ton: "puno", faliDoMin, slobodnoMjesta };
  }

  if (faliDoMin > 0) {
    return {
      oznaka: `Fali još ${faliDoMin}`,
      ton: "malo",
      faliDoMin,
      slobodnoMjesta,
    };
  }

  return {
    oznaka: `Igra se — još ${mjesta(slobodnoMjesta)}`,
    ton: "dovoljno",
    faliDoMin,
    slobodnoMjesta,
  };
}
