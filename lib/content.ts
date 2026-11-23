import type { GalleryItem, StudioSettings } from "./model";

export const brand = "Go Production";
export const defaultHero = "/images/go-hero.webp";
export const defaultReel = "/video/go-showreel.mp4";

export const defaultSettings: StudioSettings = {
  email: "",
  phone: "",
  locationSq: "Prishtinë, Kosovë",
  locationEn: "Prishtina, Kosovo",
  instagramUrl: "",
  mapUrl: "",
  heroUrl: defaultHero,
  reelUrl: defaultReel,
};

export const sampleGallery: GalleryItem[] = [
  {
    id: "5a4904c6-c045-4263-8bc3-a6efe48739b1",
    category: "wedding",
    titleSq: "Një ditë për ne",
    titleEn: "A Day for Us",
    descriptionSq: "Një studim në bardh e zi i afërsisë, me dritën natyrale të një vile prej guri.",
    descriptionEn: "A black-and-white study of intimacy, lit by the natural light of a stone villa.",
    imageUrl: "/images/go-wedding.webp",
    videoUrl: "",
    position: 10,
    isSample: true,
  },
  {
    id: "5a4904c6-c045-4263-8bc3-a6efe48739b2",
    category: "film",
    titleSq: "Aty ku nis deti",
    titleEn: "Where the Sea Begins",
    descriptionSq: "Një vështrim mbi ritmin e Rivierës shqiptare, nga shkëmbinjtë te uji i hapur.",
    descriptionEn: "A look at the rhythm of the Albanian Riviera, from limestone cliffs to open water.",
    imageUrl: "/images/go-film.webp",
    videoUrl: defaultReel,
    position: 20,
    isSample: true,
  },
  {
    id: "5a4904c6-c045-4263-8bc3-a6efe48739b3",
    category: "portrait",
    titleSq: "Në gjysmëhije",
    titleEn: "In Half Light",
    descriptionSq: "Një portret i ndërtuar me një burim drite dhe një çast qetësie.",
    descriptionEn: "A portrait built around one light source and a moment of stillness.",
    imageUrl: "/images/go-portrait.webp",
    videoUrl: "",
    position: 30,
    isSample: true,
  },
  {
    id: "5a4904c6-c045-4263-8bc3-a6efe48739b4",
    category: "commercial",
    titleSq: "Forma e aromës",
    titleEn: "The Shape of Scent",
    descriptionSq: "Qelq, gur dhe dritë e fortë në një kompozim për fotografi produkti.",
    descriptionEn: "Glass, stone, and hard light in a study for product photography.",
    imageUrl: "/images/go-editorial.webp",
    videoUrl: "",
    position: 40,
    isSample: true,
  },
];
