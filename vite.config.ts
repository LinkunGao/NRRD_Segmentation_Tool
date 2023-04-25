import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import glslify from "rollup-plugin-glslify";

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
    glslify({
      // Default
      include: ["**/*.vs", "**/*.fs", "**/*.vert", "**/*.frag", "**/*.glsl"],
      // Undefined by default
      exclude: "node_modules/**",
      // Compress shader by default using logic from rollup-plugin-glsl
      compress: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  base: "/NRRD_Segmentation_Tool/",
  build: {
    outDir: "./build",
  },
  server: {
    host: "0.0.0.0",
    // open: true,
    // proxy: {
    //   // 本地开发环境通过代理实现跨域，生产环境使用 nginx 转发
    //   // 正则表达式写法
    //   "^/": {
    //     target: "https://github.com/LinkunGao/copper3d-datasets/", // 后端服务实际地址
    //     changeOrigin: true, //开启代理
    //     // rewrite: (path) => path.replace(/^\/LinkunGao/, ""),
    //   },
    // },
  },
});
