import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => {
            return tag === "ion-icon"; // (return true)
          },
        },
      },
    }),
  ],
  base: "/NRRD_Segmentation_Tool/",
  build: {
    outDir: "./build",
  },
  server: {
    host: "0.0.0.0",
  },
});
