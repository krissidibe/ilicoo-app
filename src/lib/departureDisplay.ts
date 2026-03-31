/**
 * Libellé de départ pour l’affichage recherche / listes.
 * - Aujourd’hui → « Aujourd'hui 20:00 »
 * - Demain → « Demain 20:00 »
 * - Sinon → « Samedi 28 mars 20:00 » (jour et mois avec majuscule initiale)
 */

const capitalize = (s: string): string =>
  s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const startOfLocalDay = (d: Date): number => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

export function formatDepartureLabel(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }

  const now = new Date();
  const depDay = startOfLocalDay(d);
  const today = startOfLocalDay(now);
  const tomorrow = today + 24 * 60 * 60 * 1000;

  const timeStr = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (depDay === today) {
    return `Aujourd'hui ${timeStr}`;
  }
  if (depDay === tomorrow) {
    return `Demain ${timeStr}`;
  }

  const weekday = capitalize(
    d.toLocaleDateString("fr-FR", { weekday: "long" }),
  );
  const dayNum = d.getDate();
  const month = capitalize(
    d.toLocaleDateString("fr-FR", { month: "long" }),
  );
  return `${weekday} ${dayNum} ${month} ${timeStr}`;
}
