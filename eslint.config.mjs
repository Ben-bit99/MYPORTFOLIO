import next from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...next,
  ...nextTs,
  {
    // React Three Fiber scenes mutate imperative three.js objects (uniforms,
    // cameras, meshes) inside useFrame by design; this is the documented R3F
    // pattern and runs outside React's render, so the React Compiler's
    // immutability rule doesn't apply there.
    files: ["src/components/three/**/*.{ts,tsx}"],
    rules: { "react-hooks/immutability": "off" },
  },
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "src/data/rag-index.json"] },
];

export default config;
