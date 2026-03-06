export default function ClubComingSoon({ title, description }) {
  return (
    <section className="flex flex-1 items-center">
      <div className="w-full rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.78),rgba(34,42,62,0.7))] px-6 py-10 text-center shadow-[0_24px_60px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        <p className="font-mono text-[2rem] font-semibold text-white">{title}</p>
        <p className="mt-3 text-lg text-white/68">{description}</p>
        <div className="mx-auto mt-6 inline-flex rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-[#17dccb]">
          Coming soon
        </div>
      </div>
    </section>
  );
}
