/**
 * ═══════════════════════════════════════════════════════════════════════
 *  SINGLE SOURCE OF TRUTH — Abdul Wahib Rao portfolio
 * ═══════════════════════════════════════════════════════════════════════
 *  Everything rendered on the site AND everything the AI assistant knows
 *  comes from this file (plus optional notes in src/data/knowledge/*.md).
 *
 *  After editing this file:
 *    1. The UI updates automatically (hot reload / next build).
 *    2. Run `npm run rag:index` so the chatbot's search index is rebuilt.
 *       (If you forget, the chatbot rebuilds a keyword-only index on the fly,
 *        but semantic/vector search needs the script.)
 * ═══════════════════════════════════════════════════════════════════════
 */

/* ───────────────────────────── Types ───────────────────────────── */

export type VideoConfig = {
  /** Local file inside /public, e.g. "/videos/vr-tennis-demo.mp4" */
  src?: string;
  /** Optional WebM alternative of the same clip, e.g. "/videos/vr-tennis-demo.webm" */
  webm?: string;
  /** Optional poster image inside /public, e.g. "/images/projects/vr-tennis.jpg" */
  poster?: string;
  /**
   * Optional YouTube or Vimeo URL. Used when no local file is found
   * (or always, if `preferExternal` is true).
   * e.g. "https://www.youtube.com/watch?v=XXXXXXXXXXX" or "https://vimeo.com/123456789"
   */
  externalVideoUrl?: string;
  preferExternal?: boolean;
};

export type ProjectLink = { label: string; href: string };

export type Project = {
  /** URL-safe unique id. Also used for the chatbot citation id. */
  slug: string;
  title: string;
  /** Short one-liner shown under the title */
  tagline: string;
  category: string;
  year: string;
  role: string;
  engine?: string;
  techStack: string[];
  description: string;
  highlights: string[];
  links: ProjectLink[];
  video: VideoConfig;
  /** true = unfilled template slot. Renders a "COMING SOON" HUD badge and is
   *  excluded from the chatbot's facts (it will say details aren't available yet). */
  placeholder?: boolean;
};

export type OtherProject = {
  slug: string;
  title: string;
  year: string;
  category: string;
  techStack: string[];
  highlights: string[];
};

export type Award = {
  slug: string;
  title: string;
  event: string;
  location: string;
  date: string;
  team: string;
  organizers: string[];
  description: string;
  certificate: { src: string; alt: string };
};

export type SkillGroup = { category: string; items: string[] };

export type TimelineEntry = { year: string; label: string; detail: string };

export type SocialLink = {
  label: string;
  /** Leave href empty ("") to hide the link until you have one. */
  href: string;
  handle?: string;
};

/* ─────────────────────────── Identity ─────────────────────────── */

export const profile = {
  name: "Abdul Wahib Rao",
  firstName: "Abdul Wahib",
  /** Stacked top-left HUD logo, one word per line */
  logoLines: ["ABDUL", "WAHIB", "RAO"],
  monogram: "AWR",
  /** Version tag shown next to the logo (purely decorative) */
  version: "1.0",
  headline: "Game & XR Developer · Computer Science Student",
  role: "Game & XR Developer",
  location: "Karachi, Pakistan",
  email: "abwahib07@gmail.com",
  phone: "0332-1121418",
  /** International format for tel: links */
  phoneHref: "+923321121418",
  resumePdf: "/Abdul_Wahib_Rao_Resume.pdf",
  /** Short status line, bottom-right HUD */
  status: "Karachi · PK",

  /** Lines shown on the loading screen, in order */
  loaderLines: [
    "Games turn rules into feelings.",
    "Virtual reality turns those feelings into presence.",
  ],
  loaderRole: "I'm a Game & XR Developer.",
  loaderSignature: "I am Abdul Wahib Rao.",

  /** About section (short, shown over the 3D scene) */
  aboutShort:
    "I build immersive games and XR experiences in Unity and C#, turning physics, input and feedback into moments that feel real in your hands.",

  /** About drawer (long form) */
  aboutLong: [
    "I'm Abdul Wahib Rao, a Computer Science student at NED University of Engineering and Technology in Karachi, Pakistan, focused on game development and extended reality (AR/VR).",
    "My main work is in Unity and C#: physics-driven mechanics, XR Interaction Toolkit and Meta SDK integrations, haptics, opponent AI, and the UI and difficulty systems that keep players coming back. My VR Tennis project brought those pieces together in one fully immersive sports game.",
    "At Global Game Jam 2026 my team, Team Last Dance, won 5th prize at CEGA, Karachi.",
    "Beyond games, I build full-stack web apps with React, Node.js, Express and MongoDB, and I work with data using Python, Pandas, SQL and Power BI. That mix helps me ship playable things and measure how they perform.",
  ],

  worksIntro:
    "A selection of games and XR builds that pushed my limits in physics, input and immersion. More are on the way.",
};

export const socials: SocialLink[] = [
  // TODO: paste your real profile URLs. Empty href = hidden in the UI.
  { label: "GitHub", href: "", handle: "" },
  { label: "LinkedIn", href: "", handle: "" },
  { label: "itch.io", href: "", handle: "" },
];

/* ─────────────────────────── Education ─────────────────────────── */

export const education = {
  institution: "NED University of Engineering and Technology",
  degree: "Bachelor of Science in Computer Science",
  years: "2023 – 2027",
  cgpa: "2.9 / 4.0",
  location: "Karachi, Pakistan",
  coursework: [
    "Data Structures & Algorithms",
    "Object-Oriented Programming",
    "Database Systems",
    "Software Engineering",
    "Operating Systems",
    "Augmented & Virtual Reality",
  ],
};

/* ─────────────────── Selected Works — Games & XR ─────────────────── */

export const projects: Project[] = [
  {
    slug: "vr-tennis",
    title: "VR Tennis",
    tagline: "Immersive VR Sports Game",
    category: "Virtual Reality / Sports Game",
    year: "2026",
    role: "Developer",
    engine: "Unity",
    techStack: ["Unity", "C#", "XR Interaction Toolkit", "Meta SDK", "SteamVR", "Cinemachine"],
    description:
      "A fully immersive VR tennis game built in Unity with physics-based racket mechanics, realistic ball trajectories, an AI opponent, multiple stadiums and difficulty scaling.",
    highlights: [
      "Developed a fully immersive VR tennis game in Unity using C# with physics-based racket mechanics, ball trajectory simulation, and opponent AI for a realistic play experience.",
      "Integrated the XR Interaction Toolkit and Meta SDK to support hand-tracked controllers, enabling natural swing detection and haptic feedback on ball impact.",
      "Designed and implemented multiple stadium environments, score tracking UI, and difficulty scaling to improve player engagement and replayability.",
    ],
    links: [
      // { label: "GitHub", href: "https://github.com/..." },
      // { label: "itch.io", href: "https://....itch.io/vr-tennis" },
    ],
    video: {
      src: "/videos/vr-tennis-demo.mp4",
      webm: "/videos/vr-tennis-demo.webm",
      poster: "/images/projects/vr-tennis.jpg",
      externalVideoUrl: "", // optional: "https://www.youtube.com/watch?v=..."
    },
  },

  /* ┌──────────────────────────────────────────────────────────────┐
     │  LAST DANCE                                                  │
     │  Video:  public/videos/last-dance-demo.mp4  (optional .webm) │
     │  Poster: public/images/projects/last-dance.jpg  (optional)   │
     │  Or paste a YouTube/Vimeo link into externalVideoUrl.        │
     │  After editing: run `npm run rag:index`.                     │
     └──────────────────────────────────────────────────────────────┘ */
  {
    slug: "last-dance",
    title: "LAST DANCE",
    tagline: "Catch the dancing killer",
    category: "Game Development",
    year: "2026",
    role: "Developer",
    engine: "Unity",
    techStack: ["Unity", "C#", "Unity Animator", "URP / Post-Processing", "Blender"],
    description:
      "Last Dance is a neon-noir 3D detective game where you hunt a masked killer hiding in plain sight on the dance floor. Observe crowded nightclubs from the sidelines, spot subtle visual and behavioral anomalies, and expose the imposter before your three attempts per level run out.",
    highlights: [
      "Developed a 3D neon-noir detective game in Unity using C#, implementing crowd-observation gameplay, suspect selection, and a three-attempt-per-level investigation loop.",
      "Built distinct anomaly systems across stages, combining synchronized crowd choreography with subtle behavioral outliers and reflection-based puzzles where glass reveals hidden clues.",
      "Designed multiple stylized nightclub environments with dynamic neon lighting, animated dancer crowds, and on-screen UI prompts to escalate visual tension and observation difficulty.",
    ],
    links: [], // ← [{ label: "itch.io", href: "https://..." }, { label: "GitHub", href: "https://..." }]
    video: {
      src: "/videos/last-dance-demo.mp4",
      webm: "/videos/last-dance-demo.webm",
      poster: "/images/projects/last-dance.jpg",
      externalVideoUrl: "", // ← optional YouTube/Vimeo URL
    },
  },

  /* ┌──────────────────────────────────────────────────────────────┐
     │  SHIP BRAWL                                                  │
     │  Video:  public/videos/ship-brawl-demo.mp4  (optional .webm) │
     │  Poster: public/images/projects/ship-brawl.jpg  (optional)   │
     └──────────────────────────────────────────────────────────────┘ */
  {
    slug: "ship-brawl",
    title: "SHIP BRAWL",
    tagline: "Dynamic waters. Ruthless combat. Last ship wins.",
    category: "Game Development",
    year: "2026",
    role: "Environment Design",
    engine: "Unreal",
    techStack: ["Unreal Engine 5", "Niagara VFX", "Blueprints"],
    description:
      "Ship Brawl is a 3D naval combat game built in Unreal Engine on top of a custom ocean simulation engine. Three ships clash on dynamic open waters in a free-for-all battle where only the last vessel afloat claims victory.",
    highlights: [
      "Engineered a custom ocean engine in Unreal Engine featuring dynamic wave simulation, stylized water shaders, and real-time buoyancy physics for responsive vessel movement across shifting swells.",
      "Developed a three-ship free-for-all naval combat system covering ship steering, projectile firing, hull damage/sinking mechanics, and last-ship-standing match logic.",
    ],
    links: [],
    video: {
      src: "/videos/ship-brawl-demo.mp4",
      webm: "/videos/ship-brawl-demo.webm",
      poster: "/images/projects/ship-brawl.jpg",
      externalVideoUrl: "",
    },
  },
];

/* ───────────────── Other builds (from the resume) ───────────────── */

export const otherProjects: OtherProject[] = [
  {
    slug: "datapulse",
    title: "DataPulse — Sales & Revenue Dashboard",
    year: "2025",
    category: "Data Analysis / BI",
    techStack: ["Python", "Pandas", "Matplotlib", "Seaborn", "Power BI", "MySQL"],
    highlights: [
      "Built an end-to-end data pipeline that ingests raw CSV sales data, cleans it with Pandas, and visualises KPIs through an interactive Power BI dashboard.",
      "Wrote optimised MySQL queries to aggregate monthly revenue, top-performing products, and regional performance metrics.",
      "Applied Seaborn and Matplotlib to produce exploratory charts (heatmaps, trend lines, box plots) surfacing seasonal patterns for stakeholder reporting.",
    ],
  },
  {
    slug: "shoptrack",
    title: "ShopTrack — E-Commerce Web Application",
    year: "2024",
    category: "Full-Stack Web",
    techStack: ["HTML", "CSS", "JavaScript", "React", "Node.js", "Express", "MongoDB"],
    highlights: [
      "Developed a full-stack e-commerce platform with product listing, cart management, and order-tracking features using React and a Node/Express REST API.",
      "Designed a MongoDB schema for products, users, and orders with role-based access control for customers and administrators.",
      "Integrated responsive UI components ensuring consistent performance across desktop and mobile viewports.",
    ],
  },
];

/* ───────────────────────── Awards ───────────────────────── */

export const awards: Award[] = [
  {
    slug: "global-game-jam-2026",
    title: "5th Prize — Global Game Jam 2026",
    event: "Global Game Jam 2026",
    location: "CEGA, Karachi, Pakistan",
    date: "2026",
    team: "Team Last Dance",
    organizers: [
      "Global Game Jam (CEGA, Pakistan 2026)",
      "Ignite — National Technology Fund",
      "Tech Destination Pakistan — Ministry of IT & Telecom",
    ],
    description:
      "Recognized for creativity, dedication, collaboration, and excellence in game development at Global Game Jam 2026 at CEGA, Karachi.",
    certificate: {
      src: "/certificates/gamejam-2026.jpg",
      alt: "Global Game Jam 2026 certificate: 5th Prize presented to Abdul Wahib Rao, Team Last Dance, CEGA Pakistan 2026",
    },
  },
];

/* ───────────────────────── Skills ───────────────────────── */

export const skills: SkillGroup[] = [
  {
    category: "Game & XR",
    items: [
      "Unity", "C#", "XR Interaction Toolkit", "Meta SDK", "SteamVR", "AR/VR Development",
      "Unreal Engine 5", "Blueprints", "Niagara VFX", "Cinemachine", "URP / Post-Processing", "Unity Animator", "Blender",
    ],
  },
  { category: "Programming", items: ["C", "C++", "Python", "JavaScript", "HTML", "CSS", "SQL"] },
  { category: "Web Development", items: ["React", "Node.js", "Express", "REST APIs", "MongoDB"] },
  {
    category: "Databases",
    items: ["MySQL", "MongoDB", "SQL Query Optimization (Joins, Aggregations, Subqueries, Window Functions)"],
  },
  {
    category: "Data Analysis & Visualization",
    items: [
      "Pandas", "NumPy", "Matplotlib", "Seaborn", "EDA", "Data Cleaning",
      "Power BI (DAX Basics, Data Modelling)", "Tableau", "Excel", "KPI Reporting",
    ],
  },
  { category: "Tools & Workflow", items: ["Git", "GitHub", "Figma", "Jupyter Notebook", "VS Code", "Firebase", "openpyxl"] },
  { category: "Analytical Strengths", items: ["Data Storytelling", "Problem Solving", "Critical Thinking", "Attention to Detail"] },
];

/* ───────────────────────── Timeline ───────────────────────── */

export const timeline: TimelineEntry[] = [
  { year: "2023", label: "Enrolled at NED University", detail: "Started a BS in Computer Science in Karachi." },
  { year: "2025", label: "VR Tennis", detail: "Shipped a fully immersive VR sports game in Unity with the XR Interaction Toolkit and Meta SDK." },
  { year: "2025", label: "DataPulse & ShopTrack", detail: "Built a Power BI analytics pipeline and a full-stack MERN e-commerce app." },
  { year: "2026", label: "Global Game Jam — 5th Prize", detail: "Placed 5th with Team Last Dance at CEGA, Karachi." },
  { year: "2027", label: "Graduation (expected)", detail: "Completing the BS in Computer Science at NED University." },
];

/* ───────────────────── Navigation (HUD menu) ───────────────────── */

export const navItems = [
  { id: "about", label: "About" },
  { id: "works", label: "Works" },
  { id: "timeline", label: "Timeline" },
  { id: "vault", label: "Awards" },
  { id: "memories", label: "Memories" },
  { id: "contact", label: "Contact" },
] as const;

export type SectionId = "hero" | (typeof navItems)[number]["id"];

/* ───────────────────── Site metadata (SEO) ───────────────────── */

export const siteMeta = {
  title: "Abdul Wahib Rao :: Game & XR Developer",
  description:
    "Portfolio of Abdul Wahib Rao, a Game & XR developer and Computer Science student in Karachi building immersive Unity and VR experiences. 5th Prize at Global Game Jam 2026.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  keywords: [
    "Abdul Wahib Rao", "Game Developer", "XR Developer", "VR Developer", "Unity", "C#",
    "Meta SDK", "XR Interaction Toolkit", "Global Game Jam 2026", "NED University", "Karachi",
  ],
};

/* ───────────────────── Chatbot starter prompts ───────────────────── */

export const chatStarters = [
  "Tell me about your Unity & VR projects",
  "What did you achieve at Global Game Jam 2026?",
  "What is Abdul Wahib's tech stack?",
  "How can I contact Abdul Wahib?",
];
