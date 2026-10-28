export type Product = {
  id: string;
  name: string;
  category: "tees" | "long-sleeves";
  color: string;
  colorName: string;
  fabric: string;
  printed: boolean;
  longSleeve: boolean;
  number: string;
};
export const products: Product[] = [
  {
    id: "lunar-tee",
    name: "Lunar Tee",
    category: "tees",
    color: "#41413e",
    colorName: "Washed charcoal",
    fabric: "240 GSM · 100% cotton",
    printed: true,
    longSleeve: false,
    number: "01",
  },
  {
    id: "midnight-long-sleeve",
    name: "Midnight Long Sleeve",
    category: "long-sleeves",
    color: "#314b3b",
    colorName: "Forest green",
    fabric: "260 GSM · 100% cotton",
    printed: true,
    longSleeve: true,
    number: "02",
  },
  {
    id: "essential-tee",
    name: "Essential Tee",
    category: "tees",
    color: "#e8dfc9",
    colorName: "Natural ivory",
    fabric: "240 GSM · 100% cotton",
    printed: false,
    longSleeve: false,
    number: "03",
  },
];
export type StudioSettings = {
  background: "neon" | "studio" | "dawn" | "forest";
  collection: "all" | "tees" | "long-sleeves" | "archive";
  rail: "gold" | "chrome" | "black" | "wood";
  hanger: "chrome" | "gold" | "wood";
  click: "inspect" | "select";
  auto: boolean;
};
export const defaults: StudioSettings = {
  background: "neon",
  collection: "all",
  rail: "gold",
  hanger: "chrome",
  click: "inspect",
  auto: false,
};
