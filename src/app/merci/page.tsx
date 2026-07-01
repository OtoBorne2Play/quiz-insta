import Image from "next/image";
import Link from "next/link";

const INSTAGRAM_URL =
  "https://www.instagram.com/_borne2play_?igsh=MWRhdWtoNWtzdmlneQ%3D%3D&utm_source=qr";

export default function MerciPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
      <Image src="/assets/logo.png" alt="Borne2Play" width={280} height={105} />

      <div className="sticker-card px-8 py-10 text-center max-w-md flex flex-col items-center gap-4">
        <Image
          src="/assets/mascotte.png"
          alt="Mascotte Borne2Play"
          width={160}
          height={153}
        />
        <h1 className="font-display text-2xl text-b2p-blue">
          Réponse enregistrée !
        </h1>
        <p>
          Merci d&apos;avoir participé au quiz Borne2Play. Le classement et les
          gagnants seront annoncés sur Instagram.
        </p>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="sticker-btn bg-b2p-red text-white px-6 py-3 font-display"
        >
          Suivre @_borne2play_ sur Instagram
        </a>
        <Link href="/" className="font-display text-b2p-blue text-sm underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
