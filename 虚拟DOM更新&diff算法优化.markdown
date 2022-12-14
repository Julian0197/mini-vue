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

## 更新element流程搭建

<img src="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8d2ba3cfc24e49c7b5b3725f4bb00d8a~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?" alt="createApp-3137242.png" style="zoom:150%;" />

在渲染器初次渲染阶段，实现了打开页面的默认渲染。在这一部分，我们首先获取真实元素的`vnode`，处理`setup`函数，把它当做数据源初始化`render`函数进行渲染，最后根据`vnode`属性值依次生成DOM节点，再递归渲染子节点，将整个根组件的`vnode`渲染到页面上。

本章需要实现数据的自动更新，即当数据发生改变时，依赖的DOM元素自动进行修改或删除操作。**核心：当数据发生改变时，重新执行`render`函数，进行差异对比，然后渲染到页面上。**数据使用`ref`和`reactive`包裹，将要重新执行的`render`函数逻辑放在`effect`函数内部。实现数据和DOM更新的双向绑定。



实现以下案例：

点击按钮，`count++`，会自动更新视图。

~~~js
import { h, ref } from "../../lib/mini-vue.esm.js";

export const App = {
  name: "App",

  setup() {
    const count = ref(0);
    const onClick = () => {
      count.value++;
    };

    return {
      count,
      onClick,
    };
  },

  render() {
    // this.count => count.value  
    return h("div", { id: "root" }, [
      h("div", {}, "count: " + this.count), // 依赖收集
      h("button", { onClick: this.onClick }, "click"),
    ]);
  },
};

~~~



在初始化component实例时`createComponentInstance `，初始化属性`isMounted = false`，用于标识是否有进行第一次渲染（初始化）。接下来，在执行组件传入的`render`函数的地方，绑定响应式数据的执行函数`effect`。

+ 如果数据还没有初始化，先绑定`effect`进行初始化并收集依赖，记得初始化完成将`isMounted = true`

+ 若数据完成初始化，仍然调用`setupRenderEffect`说明正在执行更新操作，我们需要拿到旧vnode和新vnode进行对比，根据对比的内容再去更新视图，更新的逻辑后续进行实现。记得更新视图的时候，同时更新当前实例的`subTree`

~~~ts
// render.ts

function setupRenderEffect(instance: any, initialVnode: any, container: any) {
    // 依赖收集
    effect(() => {
      // 判断有没有完成初始化
      if (!instance.isMounted) {
        // init
        const { proxy } = instance;
        // 执行render函数
        const subTree = (instance.subTree = instance.render.call(proxy));
        // 由于执行render后返回依然是一个vnode对象，继续递归调用patch处理
        patch(null, subTree, container, instance);
        // patch对h函数返回的vnode进行处理（这里就是subTree）
        // 在执行mountElement后，subTree.el已经赋好值了，这个时候再把值给vnode.el
        initialVnode.el = subTree.el;

        instance.isMounted = true;
      } else {
        // update
        const { proxy } = instance;
        const subTree = instance.render.call(proxy)
        const prevSubTree = instance.subTree
        instance.subTree = subTree;
        patch(prevSubTree, subTree, container, instance)        
      }
    });
  }
~~~



可以看出在`patch`时候，需要对比两个vnode，`prevSubTree`和`subTree`，所以在`createComponentInstance`中还需要加入`subTree: {}`记录当前的children vnode。

修改`patch`的参数及其后续调用的函数参数。

+ `n1`表示旧的vnode，初试化的时候传入`null`。
+ `n2`为新的vnode，初始化时都对n2进行操作。

`render`

~~~ts
 const render = function (vnode, container) {
   // 首次渲染，第一个参数传递null
   patch(null, vnode, container, null) // 修改
 }
~~~

`patch`

~~~TS
 // n2 代表当前处理的vnode
 const patch = function (n1, n2, container, parentComponent) { // 修改
 
   const { type, shapeFlag } = n2 // 修改
 
   switch(type) {
     case Fragment:
       processFragment(n1, n2, container, parentComponent); // 修改
       break
     case Text:
       processText(n1, n2, container); // 修改
       break
     default:
       if (shapeFlag & ShapeFlags.ELEMENT) {
         processElement(n1, n2, container, parentComponent) // 修改
       } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
         processComponent(n1, n2, container, parentComponent) // 修改
       }
       break
   }
 }
~~~

`processFragment`:

```TS
 const processFragment = function(n1, n2, container, parentComponent) { // 修改
   mountChildren(n2.children, container, parentComponent) // 修改
 }
```

`processText`:

```TS
 const processText = function(n1, n2, container) { // 修改
   const { children } = n2  // 修改
   const textVNode = (n2.el = document.createTextNode(children)) // 修改
   container.append(textVNode) 
 }
```

`mountChildren`:

```TS
 const mountChildren = function (children, container, parentComponent) {
   children.forEach(v => {
     // 首次渲染无需传递第一个参数
     patch(null, v, container, parentComponent) // 修改
   })
 }
```



由于我们真实DOM元素是通过`processElement`处理`element`时渲染得到的。

所以 初始化的渲染 和 更新的渲染 逻辑是不一样的。

如果没有传递`n1`，则说明是首次渲染，反之则是更新。

`processELement`

~~~ts
const processElement = function (n1, n2, container, parentComponent) { // 修改
  if(!n1) { // 修改
    mountElement(n2, container, parentComponent)  // 修改
  } else { // 修改
    patchElement(n1, n2, container) // 修改
  }
}
~~~

