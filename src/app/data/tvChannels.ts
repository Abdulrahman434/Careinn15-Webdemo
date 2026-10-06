/* TV channels shown on the Live TV page. One line per channel; `logo` is
   served from public/channels/. */
export interface TvChannel {
  name: string;
  nameAr: string;
  logo: string;
}

export const TV_CHANNELS: TvChannel[] = [
  { name: "MBC1",                nameAr: "إم بي سي 1",             logo: "/channels/mbc1.jpg" },
  { name: "MBC Drama",           nameAr: "إم بي سي دراما",         logo: "/channels/mbc-drama.png" },
  { name: "MBC Bollywood",       nameAr: "إم بي سي بوليوود",       logo: "/channels/mbc-bollywood.jpg" },
  { name: "MBC 2",               nameAr: "إم بي سي 2",             logo: "/channels/mbc-2.png" },
  { name: "MBC Action",          nameAr: "إم بي سي أكشن",          logo: "/channels/mbc-action.png" },
  { name: "MBC 3",               nameAr: "إم بي سي 3",             logo: "/channels/mbc-3.png" },
  { name: "Al Ekhbaria",         nameAr: "الإخبارية",              logo: "/channels/al-ekhbaria.png" },
  { name: "Saudi CH For Quran",  nameAr: "القناة السعودية للقرآن", logo: "/channels/saudi-quran.png" },
  { name: "Saudi CH For Sunnah", nameAr: "القناة السعودية للسنة",  logo: "/channels/saudi-sunnah.jpg" },
  { name: "KSA SPORTS 1",        nameAr: "السعودية الرياضية 1",    logo: "/channels/ksa-sports-1.jpg" },
  { name: "KSA SPORTS 2",        nameAr: "السعودية الرياضية 2",    logo: "/channels/ksa-sports-2.jpg" },
  { name: "Abu Dhabi TV HD",     nameAr: "أبوظبي HD",              logo: "/channels/abu-dhabi-tv.jpg" },
  { name: "Al Emarat TV HD",     nameAr: "الإمارات HD",            logo: "/channels/al-emarat-tv.jpg" },
  { name: "Majid Kids TV HD",    nameAr: "ماجد للأطفال HD",        logo: "/channels/majd-kids-tv.png" },
];
