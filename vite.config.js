import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react(), tailwindcss()],
    // Backward compatibility for the existing API_BASE_URL key. New setups
    // should use VITE_API_BASE_URL as documented.
    define: {
      "import.meta.env.API_BASE_URL": JSON.stringify(env.API_BASE_URL || ""),
    },
  };
})
