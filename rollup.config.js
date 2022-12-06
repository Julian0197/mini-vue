import pkg from './package.json'
import typescript from '@rollup/plugin-typescript'

export default {
  // 入口文件
  input: "./src/index.ts",
  // 出口文件
  output: [
    // 1.cjs -> comonjs
    // 2.esm -> es6模块规范（标准）
    {
      format: "cjs",
      file: pkg.main,
    },
    {
      format: "es",
      file: pkg.moudle,
    },
  ],
  /// 安装转译官方插件 ts-->js @rollup/plugin-typescript
  plugins: [typescript()],
};