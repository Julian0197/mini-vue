# 虚拟DOM更新&diff算法优化
## 实现自定义渲染器

虚拟节点 => 真实节点：

+ 渲染到`DOM`上：在`mountElement`中，调用`DOM API`，通过`document.createElement`创建DOM元素，`el.setAttribute`设置元素属性，`el.addEventListener`添加监听事件，`container.append(el)`将元素添加到容器内。
+ 渲染到`canvas`上，则通过`new Element()`，`el.x = `，`container.addChild(el)`实现



由于，不同渲染平台操作真实元素的API不同，需要封装一个`createRenderer(options)`。传入的options有三个函数：`createElement`、`patchProp`、`insert`

~~~ts
// render.ts

export function createRenderer(options) {
    const { createElement, patchProp, insert } = options;
    function render(vnode, container);
    // ...
    return {
        createApp: createAppAPI(render)
    }
}
~~~

由于之前的`createApp`使用到了render函数，但这边重构成了createRenderer，所以直接返回一个`createAppAPI`函数传入render，里面封装了原先的createApp函数。

~~~ts
// createApp.ts

export function createAppAPI(render) {
  // createApp依赖render，我们把最底层的render包装成适用于多平台（DOM、canvas等）的createRenderer
  return function createApp(rootComponent) {
    return {
      mount(rootContainer) {
        // 先把所有东西转化为虚拟节点vnode
        // 后续所有逻辑操作基于 vnode 处理

        const vnode = createVNode(rootComponent);

        render(vnode, rootContainer);
      },
    };
  };
}
~~~

新建一个`runtime-dom`存放操作DOM元素的相关API

在`tsconfig`中设置`"moduleResolution": "node"`，能自动找到index.ts入口



~~~ts
import { createRenderer } from "../runtime-core";

function createElement(type) {
  return document.createElement(type);
}

function patchProp(el, key, val) {
  // 确认规范 on + Event name，使用正则表达式
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    // 'onClick'第二位之后的是event name
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, val);
  } else {
    el.setAttribute(key, val);
  }
}

function insert(el, parent) {
  parent.append(el);
}

const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
});

export function createApp(...args) {
  return renderer.createApp(...args);
}

export * from "../runtime-core";
~~~

最后在mini-vue入口文件导出

~~~ts
// src/index.ts

export * from "./runtime-dom"
~~~



接着实现`customerRender`，想要在`canvas`渲染

使用了`PIXIJS`这个库，使用CDN引入

> **CDN是什么？**
>
> `CDN`是内容分发网络`Content Delivery Network`。CDN是构建在**现有网络基础之上的智能虚拟网络**，依靠部署在各地的**边缘服务器**，通过中心平台的负载均衡、内容分发、调度等功能模块，使用户就近获取所需内容，降低网络拥塞，提高用户访问响应速度。
>
> 项目中使用CDN优点：
>
> - JS体积变小，使用CDN的第三方资源的JS代码，将不再打包到本地服务的JS包中。减小本地JS包体积，提高加载速度。
> - 给网页加载提速

~~~html
<script src="https://pixijs.download/release/pixi.js"></script>
~~~



在main.js中，使用PIXI渲染真实元素

~~~js
import { createRenderer } from "../../lib/mini-vue.esm.js"
import { App } from "./App.js"
// console.log(PIXI);


const game = new PIXI.Application({
  width: 500,
  height: 500
})

document.body.append(game.view)

const renderer = createRenderer({
  createElement(type) {
    // PIXI创建矩形
    if (type === "rect") {
      const rect = new PIXI.Graphics();
      rect.beginFill(0xdd0000)
      rect.drawRect(0, 0, 100, 100)
      rect.endFill()

      return rect
    }
  },
  patchProp(el, key, val) {
    el[key] = val
  },
  insert(el, parent) {
    parent.addChild(el)
  }
})

// 本来是挂载到div上的，现在挂载到game.stage
renderer.createApp(App).mount(game.stage)

// const rootContainer = document.querySelector("#app")
// createApp(App).mount(rootContainer);
~~~

~~~js
// .js要补全，用的是浏览器的ESM
import { h } from "../../lib/mini-vue.esm.js"


export const App = {
  setup() {
    return {
      x: 100,
      y: 100
    }
  },
  render() {
    return h("rect", {x: this.x, y: this.y})
  }
}
~~~

至此，实现了自定义渲染器。

<img src="C:\Users\MSK\AppData\Roaming\Typora\typora-user-images\image-20221211221547114.png" alt="image-20221211221547114" style="zoom: 25%;" />

