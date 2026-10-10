// مستويات المطور — بتتسأل عليها أول مرة تسجل دخول (عربي/إنجليزي)
export const LEVELS = {
  beginner: {
    emoji: "🌱",
    label: { ar: "مبتدئ", en: "Beginner" },
    desc: {
      ar: "لسا بتتعلم أو بدأت أول مشاريعك البرمجية",
      en: "Still learning or starting your first coding projects",
    },
  },
  intermediate: {
    emoji: "🚀",
    label: { ar: "متوسط", en: "Intermediate" },
    desc: {
      ar: "بتشتغل على مشاريع وعندك خبرة عملية",
      en: "Working on projects with hands-on experience",
    },
  },
  pro: {
    emoji: "⚡",
    label: { ar: "محترف", en: "Pro" },
    desc: {
      ar: "سنوات خبرة وبتدير مشاريع كبيرة",
      en: "Years of experience leading large projects",
    },
  },
};

export function levelLabel(level, lang = "ar") {
  const item = LEVELS[level];
  return item ? (item.label[lang] ?? item.label.ar) : null;
}

export function levelDesc(level, lang = "ar") {
  const item = LEVELS[level];
  return item ? (item.desc[lang] ?? item.desc.ar) : "";
}