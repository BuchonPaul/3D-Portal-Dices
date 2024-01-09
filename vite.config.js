// vite.config.js
import path from "path";

export default {
  // ... autres configurations Vite ...
  resolve: {
    alias: {
      three: path.resolve(
        __dirname,
        "node_modules/three/build/three.module.js"
      ),
    },
  },
};
