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

所以 **初始化的渲染** 和 **更新的渲染** 逻辑是不一样的。

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

在`patchElement`中打印一下更新时的`vnode`:

```ts
const patchElement = function(n1, n2, container) {
  console.log(n1);
  console.log(n2);
}
```



点击`button`，触发依赖，实现更新，正确进入到`patchElement`中，打印新旧vnode，至此更新element流程搭建实现完毕。

<img src="C:\Users\MSK\AppData\Roaming\Typora\typora-user-images\image-20221214211128369.png" alt="image-20221214211128369" style="zoom:33%;" />

## 更新element的props

<img src="C:\Users\MSK\AppData\Roaming\Typora\typora-user-images\image-20221214212559130.png" alt="image-20221214212559130" style="zoom:33%;" />

更新`props`，有以下三种情况：

+ foo之前的值和现在的值不一样 => 修改
+ foo之前的值被赋值为`null || undefined` => 删除
+ bar这个属性本来有的，更新后删除了 => 删除

实现以下案例：

点击三个不同按钮，实现对`ref`类型响应式数据的修改和删除

~~~js
// App.js
import { h, reactive, ref } from "../../lib/mini-vue.esm.js";

export const App = {
  setup() {
    let props = ref({
      foo: "foo",
      bar: "bar",
    });

    const changeProps1 = () => {
      props.value.foo = "new-foo";
    };
    const changeProps2 = () => {
      props.value.foo = undefined;
    };
    const changeProps3 = () => {
      props.value = {
        foo: "foo",
      }
    };
    return {
      props,
      changeProps1,
      changeProps2,
      changeProps3,
    };
  },
  render() {
    return h("div", { id: "root", ...this.props }, [
      h("button", { onClick: this.changeProps1 }, "修改props中foo属性值"),
      h("button", { onClick: this.changeProps2 }, "修改props中foo属性值变为undefined"),
      h("button", { onClick: this.changeProps3 }, "删除props中的bar属性"),
    ]);
  },
};
~~~





`props`是父组件传递给`children`的数据，在`mountElement`中第一次初始化时候要处理`props`，在`patchElement`中更新时也需要处理`props`。

之前已经将将`patchProps`在`runtime-dom`中抽离出来，现在要对比`oldProps`和`newProps`重新渲染更新，因此需要三个参数：`el`当前处理的element，`oldProps`旧vnode的props和`newProps`新vnode的props。

注意：新的vnode没有el属性，el属性是在初始化`mountElement`中挂载到`instance`上的

~~~ts
const EMPTY_OBJ = {}; 
function patchElement(n1, n2, container) {
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;

    // 旧vnode具有属性el，在mountElement中挂载，新vnode没有el
    const el = (n2.el = n1.el);

    patchProps(el, oldProps, newProps);
    // children
  }
~~~



详细解读一下`patchProps`:

+ 首先判断传入的新旧props是否一样，如果完全一样不需要更新props，直接结束
  + 如果不一样，先遍历新props
    + 看看有没有新增或修改的属性，有的话触发`el.setAttribute(key, nextVal)`
    + 修改属性为`undefined || null`会触发`el.removeAttribute(key)`
  + 如果旧的props不是空对象，再遍历旧的props，判断是否需有需要删除的元素
    + `hostPatchProp(el, key, oldProps[key], null);`



~~~ts
function patchProps(el, oldProps, newProps) {
    // 新旧完全一样，就不需要对比了
    if (oldProps !== newProps) {
      // 遍历新props，更新元素或者删除undefined
      for (const key in newProps) {
        const prevProp = oldProps[key];
        const nextProp = newProps[key];

        if (prevProp !== nextProp) {
          // runtime-dom里面处理props的函数
          hostPatchProp(el, key, prevProp, nextProp);
        }
      }

      if (oldProps !== EMPTY_OBJ) {
        // 遍历旧props，判断有没有需要删除的元素
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null);
          }
        }
      }
    }
  }
~~~



在`runtime-dom`中修改`patchProp`，也就是`render`中的`hostPatchProp`

+ 修改参数，需要新旧prop的value
+ 如果新value是undefined或null，直接删除当前DOM元素的key
+ 否则赋值当前value

~~~ts
function patchProp(el, key, prevVal, nextVal) {
  // 确认规范 on + Event name，使用正则表达式
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    // 'onClick'第二位之后的是event name
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, nextVal);
  } else {
    // 删除元素
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key)
    } else {
      // 赋值元素
      el.setAttribute(key, nextVal);
    } 
  }
}
~~~



至此，更新element的props实现完毕。

> 但是案例中的props如果用==reactive==包裹成为响应式对象
>
> 修改props会出现问题？？
>
> ~~~ts
> let props = reactive({
>       foo: "foo",
>       bar: "bar",
> }); 
> 
> const changeProps3 = () => {
> 	props = {}
> };
> ~~~
>
> 

<img src="C:\Users\MSK\AppData\Roaming\Typora\typora-user-images\image-20221216163757284.png" alt="image-20221216163757284" style="zoom:33%;" />

## 更新children

在处理完`props`的更新后，继续处理`children`的更新。由于我们在生成`vnode`时，只支持**字符串和数组**的形式来创建子节点，字符串代表文本节点，数组代表子节点，所以在更新children存在以下4种情况：

+ String -> String
+ String -> Array
+ Array -> String
+ Array -> Array

由于`Array -> Array`较为复杂，我们先来处理与文本节点相关的更新操作。



实现以下案例：

~~~js
// App.js

import { h, reactive, ref } from "../../lib/mini-vue.esm.js";
import ArrayToText from "./ArrayToText.js";
import TextToArray from "./TextToArray.js";
import TextToText from "./TextToText.js";

export const App = {
  name: "App",
  setup() {},
  render() {
    return h("div", {tId: 1}, [
      h("p", {}, "主页"),
      h(ArrayToText),
      h(TextToText),
      h(TextToArray),
    ])
  }
};
~~~
这里以`TextToArray`为例，`TextToText`和`ArrayToText`中，将setup中的isChange挂载到windows，当改变isChange.value，会触发effect进行element的更新。
~~~js
import { ref, h } from "../../lib/mini-vue.esm.js";
const prevChildren = "oldTextChildren"
const nextChildren = [h("div", {}, "A"), h("div", {}, "B")];


export default {
  name: "TextToArray",
  setup() {
    const isChange = ref(false);
    window.isChange = isChange;

    return {
      isChange
    }
  },
  render() {
    const self = this; 

    return self.isChange === true
      ? h("div", {}, nextChildren)
      : h("div", {}, prevChildren)
  }
}
~~~



处理`children`更新的逻辑还是在`patchElement`函数中触发：

~~~ts
function patchElement(n1, n2, container, parentComponent) {
	const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ
    const el = (n2.el = n1.el)
    
    // children update
    patchChildren(n1, n2, el, parentComponent) // 新增
    // props update
    patchProps(el, oldProps, newProps)
}
~~~



`patchChildren`实现所有关于`Text`类型的children节点时，逻辑如下：

+ 先获取旧节点孩子的类型，旧节点孩子，新节点孩子的类型，新节点
+ 如果新节点孩子类型是`Text`
  + 如果旧节点孩子类型是`Array`，说明是`ArrayToText`
    + 先清空Array中每一个元素，封装`unMountChildren`，传入参数是数组中每一个vnode，进行删除
  + 如果新旧孩子不相同，无论是`TextToText`还是`ArrayToText`，都要设置新的Text
    + 使用传入的`setElementText`给当前el设置text
+ 如果新节点孩子类型是`Array`
  + 判断就节点孩子是不是`Text`，是Array的情况等后面再处理
    + 如果是`Text`，要先将当前el的`textContent`置空：`hostSetElementText(container, "")`
    + 再重新渲染Array中的vnode，`mountChildren(c2, container, parentComponent)`


> 注意：这里为了统一`mountChildren`和`unMountChildren`，将第一个参数vnode都修改为当前vnode的children

~~~ts
function patchChildren(n1, n2, container, parentComponent) {
    const prevShapeFlag = n1.shapeFlag;
    const c1 = n1.children;
    const { shapeFlag } = n2;
    const c2 = n2.children;

    // ToText
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // ArrayToText
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 清空老的 children（array）
        unMountChildren(n1.children);
      }
      // TextToText
      if (c1 !== c2) {
        // 设置新children（text）
        hostSetElementText(container, c2);
      }
    } else { 
      // ToArray
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container, "")
        mountChildren(c2, container, parentComponent)
      }
    }
  }
~~~
删除当前container的children，遍历children（是一个数组）
~~~ts
  function unMountChildren(children) {
    // 每个children[i]都是h函数生成的vnode
    for (let i = 0; i < children.length; i++) {
      const el = children[i].el;
      // remove
      hostRemove(el);
    }
  }
~~~

`hostRemove`封装在`runtime-dom`，找到当前被删除元素的parent，进行删除，都是原生DOM节点的API

~~~ts
function remove(child) {
  // parentNode为DOM节点原生属性
  // removeChild为DOM节点原生属性
  const parent = child.parentNode;
  if (parent) {
    parent.removeChild(child);
  }
}
~~~

`hostSetElementText`封装在`runtime-dom`

~~~ts
function setElementText(el, text) {
  el.textContent = text
}
~~~

至此，更新children中和Text有关的element实现完毕。

## 更新children —— 两端对比diff算法

这一章慢慢处理`ArrrayToArray`情况，由于在`vnode`的更新操作时，节点的层级操作非常多，如果删除之前全部的节点重新渲染新节点，非常浪费性能。`diff`算法就是为了最小化的更新DOM。

先实现**两端diff算法对比**的情况，需要实现以下案例：

+ 新旧children从左侧对比，在某个索引前元素相同，之后的元素不同
+ 新旧children从右侧对比，在某个索引后元素相同，之前的元素不同
+ 新children长度大于老children，需要创建新元素：
  + 从左侧遍历，在某个索引前元素相同，这个索引后的元素都需要重新创建，添加到parent的尾部
  + 从右侧遍历，在某个索引后元素相同，这个索引前的元素都需要重新创建，添加到parent的头部（其实是利用`insertBefore`添加到旧children索引最靠前的相同元素的前面）
+ 老children长度大于新children，需要删除元素：
  + 从左侧遍历，某个索引前元素相同，这个索引后老children中的元素都需要删除
  + 从右侧遍历，某个索引后元素相同，这个索引前老children中的元素都需要删除
+ 从左侧遍历有相同元素，从右侧遍历也有相同元素，中间元素不同



实现案例的方式和上一节类似，通过改变window对象的`isChanged = true`，将`prevChild`改变为`nextChild`，实现自动更新渲染。

~~~js
const App = {
  setup() {
    // 设置响应式数据
    const isChange = reactive({
      value: false
    })
    window.isChange = isChange;

    return {
      isChange
    }
  },

  render() {
    let self = this
		// 响应式数据改变时，更新children
    return self.isChange.value === true ? 
          h('div', {}, nextChild) :
          h('div', {}, prevChild)
  }
}
~~~

上一节中实现和`text`类型相关的渲染更新时，在`patchChildren`中实现，最后一种情况就是`ArrayToArray`。单独封装`patchKeyedChildren`。

+ 我们需要三个指针，分别指向队头，和新旧children array的队尾

+ 封装`isSomeVNodeType`，用于判断两个vnode是否相同：判断属性`key`和`type`是否一致，`key`是我们在写案例时手动赋值在props属性中的，一致的话需要继续调用`patch`对`children`进行判断

+ **新增参数`parentAnchor`，用于标注新创建的元素在哪个元素之前。在`runtime-dom`中也需要修改`insert`，如果初试先传入null，这样会插入到当前parent的最后。（注意：需要变更所有与`hostInsert`相关API的参数，加入anchor参数）**

  ~~~ts
  function insert(child, parent, anchor) {
    // parent.append(el);
    // anchor为null，默认会添加到最后
    parent.insertBefore(child, anchor || null)
  }
  ~~~

~~~ts
function patchKeyedChildren(
    c1,
    c2,
    container,
    parentComponent,
    parentAnchor
  ) {
    const l2 = c2.length;
    let i = 0; // 队头指针
    // 队尾指针
    let e1 = c1.length - 1;
    let e2 = l2 - 1;

    // 判断n1,n2是否一样
    function isSomeVNodeType(n1, n2) {
      // 基于 type 和 key判断是否一致
      return n1.type === n2.type && n1.key === n2.key;
    }
}
~~~

### 左侧遍历

while循环，从左向右移动头指针（头指针不超过两个children array的的长度），碰到相同的节点（type和key相同）继续调用patch对比他们的children。当前头结点指向的节点不同后，跳出循环，该头结点索引之后的节点需要处理，处理逻辑后续完成。

~~~ts
// 1.左侧
while (i <= e1 && i <= e2) {
  const n1 = c1[i];
  const n2 = c2[i];
  // 判断type和key是否一致
  if (isSomeVNodeType(n1, n2)) {
    // 调用patch递归对比（有可能内部children不一样）
    patch(n1, n2, container, parentComponent, parentAnchor);
  } else {
    break;
  }
  i++;
}
~~~

循环结束后，`i=2 e1=2 e2=3`

<img src="C:\Users\MSK\AppData\Roaming\Typora\typora-user-images\image-20221217221813467.png" alt="image-20221217221813467" style="zoom: 33%;" />

### 右侧遍历

while循环，从右往左同时移动e1、e2指针，相同调用patch，不相同跳出循环，e1索引之前的节点需要删除，在头部添加e2索引之前的节点。

~~~ts
// 2.右侧
while (i <= e1 && i <= e2) {
  const n1 = c1[e1];
  const n2 = c2[e2];
  if (isSomeVNodeType(n1, n2)) {
    patch(n1, n2, container, parentComponent, parentAnchor);
  } else {
    break;
  }
  e1--;
  e2--;
}
~~~

循环结束后，`i=0 e1=0 e2=1`

<img src="C:\Users\MSK\AppData\Roaming\Typora\typora-user-images\image-20221217221838730.png" alt="image-20221217221838730" style="zoom: 33%;" />

### 新的比老的长 - 创建

~~~ts
// 3.新的比老的多 创建
if (i > e1) {
  if (i <= e2) {
    // debugger;
    const nextPos = e2 + 1;
    const anchor = nextPos < l2 ? c2[nextPos].el : null;
    // 传入anchor，是为了在某个el前插入元素
    // 在parent的最后插入元素直接传null，等同于append
    while( i <= e2) {
      patch(null, c2[i], container, parentComponent, anchor);
      i++
    }
  }
}
~~~

#### 右侧一样 - 把新创建的添加到头部

从右侧遍历，while循环结束后，`i=0 e1=-1 e2=0`。我们要在e2的位置添加新创建元素，所以将`anchor`设置为`c2[e2+1].el`，找到元素`a`，在a前面添加新元素c。**判断条件：e2+1<l2，如果e2+1>l2，说明在后面添加，将anchor设置为null。**

<img src="C:\Users\MSK\AppData\Roaming\Typora\typora-user-images\image-20221217221919737.png" alt="image-20221217221919737" style="zoom: 33%;" />

#### 左侧一样 - 把新创建的添加到尾部

先从左侧遍历，while循环结束后，`i=2 e1=1 e2=2`，这时候由于新的比老的多，`i>e1且i<e2`，需要在尾部添加新创建的元素，需要将`anchor`设置为`null`。**判断条件：e2+1>=l2**。

<img src="C:\Users\MSK\AppData\Roaming\Typora\typora-user-images\image-20221218114345086.png" alt="image-20221218114345086" style="zoom:48%;" />

### 老的比新的长 - 删除

~~~ts
else if (i > e2) {
      // 4.老的比新的多
      while(i <= e1) {
        hostRemove(c1[i].el)
        i++
      }
    } else {
      // 乱序部分
}
~~~

#### 左侧一样 - 把多余的从尾部删除

从左向右遍历完后，`i=2 e1=2 e2=1`，将索引为`i~e1`vnode的el删除，`hostRemove(c1[i].el)`

<img src="C:\Users\MSK\AppData\Roaming\Typora\typora-user-images\image-20221217221947045.png" alt="image-20221217221947045" style="zoom: 33%;" />

#### 右侧一样 - 把多余的从头部删除

从右往左完成遍历后，`i=0 e1=0 e2=-1`，将索引为`i~e1`vnode的el删除

<img src="C:\Users\MSK\AppData\Roaming\Typora\typora-user-images\image-20221217222006844.png" alt="image-20221217222006844" style="zoom: 33%;" />

### 中间对比 

<img src="C:\Users\MSK\AppData\Roaming\Typora\typora-user-images\image-20221217224234218.png" alt="image-20221217224234218" style="zoom:33%;" />

## 更新children —— 中间对比（修改/删除）

先实现中间对比中，修改存在的节点 和 删除多余的节点。

下面案例中，中间部分：`c`是相同节点（但是props不同，需要patchProps），d在新的里面没有需要删除。

~~~js
// 5.对比中间的部分
// 删除老的，在老的中存在，在新的中不存在
// 5.1
// a b (c d) f g
// a b (e c) f g
// d节点在新的中没有，需要删除
// c节点的props发生变化
 const prevChildren = [
   h("p", { key: "A" }, "A"),
   h("p", { key: "B" }, "B"),
   h("p", { key: "C", id: "c-prev" }, "C"),
   h("p", { key: "D" }, "D"),
   h("p", { key: "F" }, "F"),
   h("p", { key: "G" }, "G"),
 ];

 const nextChildren = [
   h("p", { key: "A" }, "A"),
   h("p", { key: "B" }, "B"),
   h("p", { key: "E" }, "E"),
   h("p", { key: "C", id: "c-next" }, "C"),
   h("p", { key: "F" }, "F"),
   h("p", { key: "G" }, "G"),
 ];
~~~

实现思路：

+ `keyToNewIndexMap`建立c2中，中间不同元素的`key`和索引值的映射关系
+ 遍历c1 中间不同的元素，记录当前元素在c2中的索引`newIndex`
  + 如果当前元素有`key`，在前面实现的`map`中寻找当前元素key在c2中的索引值
  + 如果当前元素没有`key`，for循环遍历c2，使用`isSomeVNodeType`判断元素是否相同
+ 根据`newIndex`判断当前c1正在遍历的元素，需要深度patch还是删除。
  + 如果`newIndex`不存在，说明旧的有，新的没有，直接删除`hostRemove(prevChild.el)`
  + 如果`newIndex`存在，深度patch，`patch(prevChild.el, c2[newIndex].el, container, parenetComponent, null)`

~~~ts
else {
    // 中间对比
    let s1 = i;
    let s2 = i;

    const toBePatched = e2 - s2 + 1; // 新array children中需要被patch的个数
    let patched = 0; // patch完一次，+1
    // 建立新children array中，中间不同元素的key和索引值的映射关系
    const keyToNewIndexMap = new Map();
    for (let i = s2; i <= e2; i++) {
      const nextChild = c2[i];
      keyToNewIndexMap.set(nextChild.key, i)
    }

    for (let i = s1; i <= e1; i++) {
      const prevChild = c1[i];
      let newIndex;

      if (patched >= toBePatched) {
        hostRemove(prevChild.el);
        continue;
      }

      // null || undefined
      if (prevChild.key !== null) {
        newIndex = keyToNewIndexMap.get(prevChild.key)
      } else {
        // 没有key只能循环遍历新children array查找有没有旧children array的元素
        for (let j = s2; j <= e2; j++) {
          if (isSomeVNodeType(prevChild, c2[j])) {
            newIndex = j;
            break;
          }
        }
      }
      // newIndex不存在，说明在新array children中没找到，需要删除
      if (newIndex === undefined) {
        hostRemove(prevChild.el)
      } else {
        // newIndex存在，继续patch深度对比修改（children）
        patch(prevChild, c2[newIndex], container, parentComponent, null)
        patched++
      }
    }
  }
~~~

优化一下，当中间部分新的节点都被遍历过后，老的多出来的节点可以直接删除。

~~~js
// 中间部分老的比新的多
// （优化5.1）当中间部分新的节点都被遍历过后，老的多出来的节点可以直接删除
// a b (c e d) f g
// a b (e c) f g
const prevChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "C", id: "c-prev" }, "C"),
  h("p", { key: "E" }, "E"),
  h("p", { key: "D" }, "D"),
  h("p", { key: "F" }, "F"),
  h("p", { key: "G" }, "G"),
];

const nextChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "E" }, "E"),
  h("p", { key: "C", id: "c-next" }, "C"),
  h("p", { key: "F" }, "F"),
  h("p", { key: "G" }, "G"),
];
~~~
需要添加两个变量，`toBePatched`记录c2中间所有不同元素的个数，`patched`在c2中间元素被patch过后，+1自增。如果`patched === toBePatched`说明新children array中间不同元素都被patch过，那么如果c1中间不同元素还没遍历完，那么说明这些元素都是多余的了，可以直接删除，并进行下一个元素的删除操作。
~~~ts
const toBePatched = e2 - s2 + 1; // 新array children中需要被patch的个数
let patched = 0; // patch完一次，+1

// for循环遍历c1时，判断
if (patched >= toBePatched) {
  hostRemove(prevChild.el);
  continue;
}
~~~

## 更新children —— 中间对比（增加/移动）

上一节中，删除了c2中间不存在，但是c1中间存在的元素。但是对于c1c2中间都有的元素，不仅需要深度patch，还需要移动到合适的位置。

实现以下综合案例：

~~~js
// a b (c d e z) f g
// a b (d c y e) f g
// c1和c2中 ce的顺序一致
const prevChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),

  h("p", { key: "C", id: "prev-id"}, "C"),
  h("p", { key: "D" }, "D"),
  h("p", { key: "E" }, "E"),
  h("p", { key: "Z" }, "Z"),

  h("p", { key: "F" }, "F"),
  h("p", { key: "G" }, "G"),
];
const nextChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),

  h("p", { key: "D" }, "D"),
  h("p", { key: "C", id: "next-id"}, "C"),
  h("p", { key: "Y" }, "Y"),
  h("p", { key: "E" }, "E"),

  h("p", { key: "F" }, "F"),
  h("p", { key: "G" }, "G"),
];
~~~

可以看到中间部分，需要删除旧元素`Z`，创建新元素`Y`，`C`和`E`的相对顺序不用改变，只需要改变`D`一个元素的顺序。

<img src="C:\Users\MSK\AppData\Roaming\Typora\typora-user-images\image-20221227140956045.png" alt="image-20221227140956045" style="zoom:50%;" /> 



**实现思路：**

+ 创建定长数组`newIndexToOldIndexMap`，长度为c2中间不同的元素个数。记录c1中元素在c2中的位置变化。初试值都是0,`0`表示该元素在c2有c1没有，需要重新patch创建。

  + 比如`C D E Z`，遍历c1时候，`newIndexToOldIndexMap[newIndex - s2] = i + 1`，i为当前遍历元素在c1中的索引，newIndex为当前元素在c2中的索引，最后`C D E Z` => `D C Y E`，定长数组变为`[1+1 0+1 0 2+1]`(这边假设c的索引为0，前面没有元素)

+ 接下来使用`getSequence`，获取`newIndexToOldIndexMap`的最长递增子序列，`[2 1 0 3]` => `[1 3]`，最长递增子序列数组中记录的是不需要改变位置的元素索引。不在其中的元素，需要移动位置或者重新创建。

  + 从后向前遍历，`for (let i = toBePatched - 1; i >= 0; i--)`，`anchor`就为nextIndex + 1的元素，不会出现插入异常

  贪心算法+二分法，获取最长递增子序列，获得的数组中记录的是索引。

  ~~~ts
  function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
      const arrI = arr[i];
      if (arrI !== 0) {
        j = result[result.length - 1];
        if (arr[j] < arrI) {
          p[i] = j;
          result.push(i);
          continue;
        }
        u = 0;
        v = result.length - 1;
        while (u < v) {
          c = (u + v) >> 1;
          if (arr[result[c]] < arrI) {
            u = c + 1;
          } else {
            v = c;
          }
        }
        if (arrI < arr[result[u]]) {
          if (u > 0) {
            p[i] = result[u - 1];
          }
          result[u] = i;
        }
      }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
      result[u] = v;
      v = p[v];
    }
    return result;
  }
  ~~~

  

+ 优化点：使用`moved`变量记录是否需要移动元素，如果不需要移动元素，则不需要调用`getSequence`。`newIndex`和`maxNewIndexSoFar`比较，如果`newIndex`始终更大，说明顺序没有改变，否则则需要移动元素。

~~~ts
function patchKeyedChildren(
    c1,
    c2,
    container,
    parentComponent,
    parentAnchor
  ) {
    const l2 = c2.length;
    let i = 0; // 队头指针
    // 队尾指针
    let e1 = c1.length - 1;
    let e2 = l2 - 1;

    // 判断n1,n2是否一样
    function isSomeVNodeType(n1, n2) {
      // 基于 type 和 key判断是否一致
      return n1.type === n2.type && n1.key === n2.key;
    }

    // 1.左侧
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      // 判断type和key是否一致
      if (isSomeVNodeType(n1, n2)) {
        // 调用patch递归对比（有可能内部children不一样）
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      i++;
    }

    // 2.右侧
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSomeVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      e1--;
      e2--;
    }

    // 3.新的比老的多 创建
    if (i > e1) {
      if (i <= e2) {
        // debugger;
        const nextPos = e2 + 1;
        const anchor = nextPos < l2 ? c2[nextPos].el : null;
        // 传入anchor，是为了在某个el前插入元素
        // 在parent的最后插入元素直接传null，等同于append
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      // 4.老的比新的多
      while (i <= e1) {
        hostRemove(c1[i].el);
        i++;
      }
    } else {
      // 中间对比
      // i是中间部分的起始索引
      let s1 = i;
      let s2 = i;

      const toBePatched = e2 - s2 + 1; // 新array children中需要被patch的个数
      let patched = 0; // patch完一次，+1

      // 建立新children array中，中间不同元素的key和索引值的映射关系
      const keyToNewIndexMap = new Map();

      // 建立索引顺序映射
      const newIndexToOldIndexMap = new Array(toBePatched);
      let moved = false;
      let maxNewIndexSoFar = 0;

      for (let i = 0; i < toBePatched; i++) {
        newIndexToOldIndexMap[i] = 0;
      }

      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }

      // 遍历c1中间部分
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i];
        let newIndex;

        if (patched >= toBePatched) {
          hostRemove(prevChild.el);
          continue;
        }

        // null || undefined
        if (prevChild.key !== null) {
          newIndex = keyToNewIndexMap.get(prevChild.key);
        } else {
          // 没有key只能循环遍历新children array查找有没有旧children array的元素
          for (let j = s2; j <= e2; j++) {
            if (isSomeVNodeType(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }
        // newIndex不存在，说明在新array children中没找到，需要删除
        if (newIndex === undefined) {
          hostRemove(prevChild.el);
        } else {
          // 判断是否需要移动
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }
          // 在c2中找到了，和c1中想同key的元素
          // newIndex是c1中的相同元素在c2中的索引，newIndex-s2将中间部分从0开始计数
          // i + 1值为，在c1中的索引，由于初始值0代表没有的元素，要区分开
          // 比如: c1中 c d e z，c2中 d c y e
          // 【1+1 0+1 0 2+1】
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          // newIndex存在，继续patch深度对比修改（children）
          patch(prevChild, c2[newIndex], container, parentComponent, null);
          patched++;
        }
      }
      // 【1+1 0+1 0 2+1】=> [1 3]这里1 3是最长递增子序列的索引
      const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];

      // 从后向前遍历，插入时不会报错
      let j = increasingNewIndexSequence.length - 1;
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2;
        const nextChild = c2[nextIndex];
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;

        // 老的不存在，新的存在，需要重新创建
        if (newIndexToOldIndexMap[i] === 0) {
          patch(null, nextChild, container, parentComponent, anchor)
        }

        if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            hostInsert(nextChild.el, container, anchor);
          } else {
            j--;
          }
        }
      }
    }
  }
~~~

至此，更新children —— 中间对比（增加/移动）实现完毕。

diff算法中`ArrayToArray`全部实现。
