/* TV channels shown on the Live TV page. One line per channel; `logo` is
   served from public/channels/. */
export type TvChannelCategory = "general" | "news" | "sports" | "kids" | "religious";

export interface TvChannel {
  name: string;
  nameAr: string;
  logo: string;
  category: TvChannelCategory;
}

export const TV_CHANNELS: TvChannel[] = [
  { name: "MBC1",                nameAr: "إم بي سي 1",             logo: "/channels/mbc1.jpg",            category: "general" },
  { name: "MBC Drama",           nameAr: "إم بي سي دراما",         logo: "/channels/mbc-drama.png",       category: "general" },
  { name: "MBC Bollywood",       nameAr: "إم بي سي بوليوود",       logo: "/channels/mbc-bollywood.jpg",   category: "general" },
  { name: "MBC 2",               nameAr: "إم بي سي 2",             logo: "/channels/mbc-2.png",           category: "general" },
  { name: "MBC Action",          nameAr: "إم بي سي أكشن",          logo: "/channels/mbc-action.png",      category: "general" },
  { name: "MBC 3",               nameAr: "إم بي سي 3",             logo: "/channels/mbc-3.png",           category: "general" },
  { name: "Al Ekhbaria",         nameAr: "الإخبارية",              logo: "/channels/al-ekhbaria.png",     category: "news" },
  { name: "Saudi CH For Quran",  nameAr: "القناة السعودية للقرآن", logo: "/channels/saudi-quran.png",     category: "religious" },
  { name: "Saudi CH For Sunnah", nameAr: "القناة السعودية للسنة",  logo: "/channels/saudi-sunnah.jpg",    category: "religious" },
  { name: "KSA SPORTS 1",        nameAr: "السعودية الرياضية 1",    logo: "/channels/ksa-sports-1.jpg",    category: "sports" },
  { name: "KSA SPORTS 2",        nameAr: "السعودية الرياضية 2",    logo: "/channels/ksa-sports-2.jpg",    category: "sports" },
  { name: "Abu Dhabi TV HD",     nameAr: "أبوظبي HD",              logo: "/channels/abu-dhabi-tv.jpg",    category: "general" },
  { name: "Al Emarat TV HD",     nameAr: "الإمارات HD",            logo: "/channels/al-emarat-tv.jpg",    category: "general" },
  { name: "Majid Kids TV HD",    nameAr: "ماجد للأطفال HD",        logo: "/channels/majd-kids-tv.png",    category: "kids" },
];
