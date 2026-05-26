/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Native ONNX binaries don't bundle cleanly — load from node_modules at runtime.
    serverComponentsExternalPackages: ["@xenova/transformers", "onnxruntime-node"],
  },
  // Ensure the RAG index files ship with the serverless functions on Vercel.
  // Without this, Next's file-trace can miss data read via fs.readFileSync.
  outputFileTracingIncludes: {
    "/api/ask": ["./data/rag/**"],
    "/api/search": ["./data/rag/**"],
    "/api/diagnose": ["./data/rag/**"],
  },
};

export default nextConfig;
