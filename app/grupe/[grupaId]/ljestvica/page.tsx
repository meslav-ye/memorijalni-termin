/**
 * Tab "Ljestvica". Pravi izracun — strijelci, asistenti, dolaznost, omjer
 * pobjeda i rekordi — dolazi u M8, kad postoje odigrani termini.
 */
export default function StranicaLjestvice() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="font-medium">Još nema odigranih termina</p>
      <p className="mt-1 text-sm text-slate-500">
        Ljestvica se puni sama kad se odigra prvi termin.
      </p>
    </div>
  );
}
