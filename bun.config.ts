// Bun Configuration for Backend
export default {
  // Entry point
  entrypoints: ["./server/index.ts"],
  
  // Output directory
  outdir: "./dist",
  
  // Target Bun runtime
  target: "bun",
  
  // Minify for production
  minify: process.env.NODE_ENV === "production",
  
  // Source maps for debugging
  sourcemap: "external",
  
  // External packages (don't bundle)
  external: [
    "@prisma/client",
    ".prisma/client",
  ],
};
