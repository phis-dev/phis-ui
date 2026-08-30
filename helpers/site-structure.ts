export type NavItem = {
  key: string;
  label: string;
  href: string;
  children?: NavItem[];
};

export type ProductPanel = {
  key: string;
  title: string;
  text: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    key: "home",
    label: "Home",
    href: "/",
  },
  {
    key: "products",
    label: "Products",
    href: "/products",
    children: [
      { key: "webhosting", label: "Web Hosting", href: "/products#webhosting" },
      { key: "nextcloud", label: "Nextcloud", href: "/products#nextcloud" },
      { key: "privo", label: "Privo", href: "/products#privo" },
      { key: "gui", label: "GUI Engineering", href: "/products#gui" },
    ],
  },
  {
    key: "news",
    label: "News",
    href: "/news",
  },
  {
    key: "about",
    label: "Company",
    href: "/about",
    children: [
      {
        key: "about-contact",
        label: "Contact",
        href: "/contact",
      },
      {
        key: "about-newsletter",
        label: "Newsletter",
        href: "/newsletter",
      },
      {
        key: "about-imprint",
        label: "Imprint",
        href: "/impressum",
      },
      {
        key: "about-privacy",
        label: "Privacy",
        href: "/privacy",
      },
      {
        key: "about-terms",
        label: "Terms",
        href: "/terms-and-conditions",
      },
    ],
  },
  {
    key: "faq",
    label: "FAQ",
    href: "/faq",
  },
];

export const PRODUCT_PANELS: ProductPanel[] = [
  {
    key: "webhosting",
    title: "Content management with Contao",
    text: "Your professional web presence, preconfigured with its own domain and a secure technical baseline.",
  },
  {
    key: "nextcloud",
    title: "Nextcloud storage",
    text: "Independent, encrypted collaboration on your own hosting with access from anywhere.",
  },
  {
    key: "privo",
    title: "Privo application",
    text: "Digital correspondence with templates, deadlines, history, and PDF generation in one interface.",
  },
  {
    key: "gui",
    title: "GUI engineering",
    text: "Senior expertise for cross-platform applications built with Qt, web, and app frameworks.",
  },
];
