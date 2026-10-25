import type { IptvChannel } from "../utils/androidBridge";

/* Shown when the hospital's channel list can't be loaded (browser, server
   down) so the Live TV screen still has its real look. Not playable: no
   stream address. Logos are served from public/channels/. */
export const PREVIEW_CHANNELS: IptvChannel[] = [
  { id: -1,  name: "MBC1",                nameAr: "إم بي سي 1",             logo: "/channels/mbc1.jpg",          url: "", category: "general" },
  { id: -2,  name: "MBC Drama",           nameAr: "إم بي سي دراما",         logo: "/channels/mbc-drama.png",     url: "", category: "general" },
  { id: -3,  name: "MBC Bollywood",       nameAr: "إم بي سي بوليوود",       logo: "/channels/mbc-bollywood.jpg", url: "", category: "general" },
  { id: -4,  name: "MBC 2",               nameAr: "إم بي سي 2",             logo: "/channels/mbc-2.png",         url: "", category: "general" },
  { id: -5,  name: "MBC Action",          nameAr: "إم بي سي أكشن",          logo: "/channels/mbc-action.png",    url: "", category: "general" },
  { id: -6,  name: "MBC 3",               nameAr: "إم بي سي 3",             logo: "/channels/mbc-3.png",         url: "", category: "kids" },
  { id: -7,  name: "Al Ekhbaria",         nameAr: "الإخبارية",              logo: "/channels/al-ekhbaria.png",   url: "", category: "news" },
  { id: -8,  name: "Saudi CH For Quran",  nameAr: "القناة السعودية للقرآن", logo: "/channels/saudi-quran.png",   url: "", category: "religious" },
  { id: -9,  name: "Saudi CH For Sunnah", nameAr: "القناة السعودية للسنة",  logo: "/channels/saudi-sunnah.jpg",  url: "", category: "religious" },
  { id: -10, name: "KSA SPORTS 1",        nameAr: "السعودية الرياضية 1",    logo: "/channels/ksa-sports-1.jpg",  url: "", category: "sports" },
  { id: -11, name: "KSA SPORTS 2",        nameAr: "السعودية الرياضية 2",    logo: "/channels/ksa-sports-2.jpg",  url: "", category: "sports" },
  { id: -12, name: "Abu Dhabi TV HD",     nameAr: "أبوظبي HD",              logo: "/channels/abu-dhabi-tv.jpg",  url: "", category: "general" },
  { id: -13, name: "Al Emarat TV HD",     nameAr: "الإمارات HD",            logo: "/channels/al-emarat-tv.jpg",  url: "", category: "general" },
  { id: -14, name: "Majid Kids TV HD",    nameAr: "ماجد للأطفال HD",        logo: "/channels/majd-kids-tv.png",  url: "", category: "kids" },
];
