# mini-vue3实现
## setup环境-集成jest做单元测试
### 初始化项目
+ `yarn init -y` 初始化项目
+ `npx tsc --init` 生成tsconfig
+ `yarn add jest @types/jest --dev` 添加jest
#### npm和yarn

### jest单元测试
~~~js
import { moudle } from "";
it("init", () => {
  expect(add(1, 1)).toBe(2);
});
~~~
单元测试失败：jest默认运行在nodejs环境，node下默认模块规范是CommonJS规范，现在使用的是ESM规范，要使用Babel转换。
#### CommonJS 和 ESM模块规范


