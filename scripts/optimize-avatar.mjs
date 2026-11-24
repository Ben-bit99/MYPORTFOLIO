/**
 * Optimise a character GLB for the web.
 *   node scripts/optimize-avatar.mjs <input.glb> [output.glb] [ratio]
 *
 * - removes presentation-only meshes (Sketchfab particle/plate planes)
 * - merges duplicate vertices, simplifies with meshoptimizer (error-bounded)
 * - compresses geometry with EXT_meshopt_compression (decoded by drei's useGLTF)
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, simplify, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const [input, output = "public/models/avatar.glb", ratioArg = "0.2"] = process.argv.slice(2);
if (!input) {
  console.error("usage: node scripts/optimize-avatar.mjs <input.glb> [output.glb] [ratio]");
  process.exit(1);
}
const DROP = /^Plane29[67]/; // particle dust + stray display card in the source model

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });

const doc = await io.read(input);
const root = doc.getRoot();

const tris = () =>
  root
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3, 0);

for (const node of root.listNodes()) {
  if (DROP.test(node.getName())) {
    node.getMesh()?.dispose();
    node.dispose();
  }
}
console.log(`triangles before: ${Math.round(tris()).toLocaleString()}`);

await doc.transform(
  prune(),
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: Number(ratioArg), error: 0.0015 }),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);

console.log(`triangles after:  ${Math.round(tris()).toLocaleString()}`);
await io.write(output, doc);
console.log(`wrote ${output}`);
