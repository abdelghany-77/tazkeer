import React from "react";

export const SadaqaBanner: React.FC = () => {
  return (
    <div className="relative shrink-0 w-full overflow-hidden rounded-2xl px-5 py-4 border border-border-subtle/80 bg-gradient-to-br from-primary-card/90 via-primary-surface/95 to-primary-card/90 shadow-md text-center">
      {/* Ambient background glows */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-accent-gold/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-accent-mint/10 rounded-full blur-2xl pointer-events-none" />

      <p className="font-quran text-sm sm:text-base md:text-lg leading-[2.1] text-text-primary font-bold select-text px-2 tracking-wide">
        اللَّهُمَّ اجْعَلْهَا صَدَقَةً جَارِيَةً عَلَى رُوحِ أَحْمَد عَبْدالغَنِي أَحْمَد وَجَمِيعِ أَمْوَاتِ الْمُسْلِمِينَ
      </p>
    </div>
  );
};
