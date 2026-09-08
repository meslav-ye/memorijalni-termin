import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAvailableMethods } from "@/lib/auth-settings";
import { LoginForm } from "./LoginForm";

const ERROR_MESSAGES: Record<string, string> = {
  link: "Prijava nije dovršena. Link je možda istekao — pokušaj ponovno.",
  google: "Prijava Googleom nije uspjela.",
  // Legacy query value from older callbacks
  veza: "Prijava nije dovršena. Link je možda istekao — pokušaj ponovno.",
};

/** Reasons returned by /auth/callback, translated into something readable. */
const REASONS: Record<string, string> = {
  no_code: "Nismo dobili kod za prijavu — preusmjeravanje je izgubilo parametre.",
  exchange: "Kod je stigao, ali ga nismo mogli zamijeniti za sesiju.",
  bez_koda: "Nismo dobili kod za prijavu — preusmjeravanje je izgubilo parametre.",
  zamjena: "Kod je stigao, ali ga nismo mogli zamijeniti za sesiju.",
  access_denied: "Prijava je odbijena na Google strani.",
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/prijava">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already signed in — nothing to do on the login screen.
  if (user) redirect("/");

  const params = await searchParams;
  // Accept both new (`error`) and legacy (`greska`) query keys.
  const errorCode =
    typeof params.error === "string"
      ? params.error
      : typeof params.greska === "string"
        ? params.greska
        : null;
  const errorFromUrl = errorCode ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.link) : null;

  const reason =
    typeof params.reason === "string"
      ? params.reason
      : typeof params.razlog === "string"
        ? params.razlog
        : null;
  const detail =
    typeof params.detail === "string"
      ? params.detail
      : typeof params.detalj === "string"
        ? params.detalj
        : null;

  const methods = await getAvailableMethods();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <header className="mb-8">
        {/* The logo carries the app name, so h1 is visually hidden — kept for
            screen readers and search. `priority` because it is the first thing seen. */}
        <h1 className="sr-only">Memorijalni termin</h1>

        {/* The new mark has its own dark plate under the text, so it works on
            both light and dark backgrounds — unlike the previous one, whose
            text was dark green and disappeared on dark. */}
        <Image
          src="/logo.png"
          alt="Memorijalni termin"
          width={1200}
          height={400}
          priority
          className="h-auto w-full max-w-[19rem]"
        />

        <p className="mt-4 text-slate-600">Prijavi se da vidiš termine svoje grupe.</p>
      </header>

      {errorFromUrl && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <p className="font-medium">{errorFromUrl}</p>

          {(reason || detail) && (
            <p className="mt-2 text-xs text-red-600">
              {reason && (REASONS[reason] ?? `Razlog: ${reason}`)}
              {detail && <span className="mt-1 block font-mono break-all">{detail}</span>}
            </p>
          )}
        </div>
      )}

      <LoginForm googleAvailable={methods.google} />

      <p className="mt-10 text-center text-xs text-slate-400">
        Prijavom pristaješ da spremamo tvoje ime, nadimak i email — samo za rad aplikacije.
      </p>
    </main>
  );
}
