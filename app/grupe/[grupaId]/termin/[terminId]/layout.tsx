/** Pass-through so `loading.tsx` covers termin ↔ ekipe ↔ uživo navigations. */
export default function TerminLayout({
  children,
}: LayoutProps<"/grupe/[grupaId]/termin/[terminId]">) {
  return children;
}
