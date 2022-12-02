# mini-vue3实现（2）
## 实现初始化component主流程

先看看，vue3中初始绑定html的写法

~~~html
 <!DOCTYPE html>
 <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta http-equiv="X-UA-Compatible" content="IE=edge">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Document</title>
   </head>
   <body>
     <div id="app"></div>
     <!-- 避免使用打包工具打包，降低流程，便于调试，这里直接将逻辑放在render.js中，使用script标签进行引入 -->
     <script src="./process/render.js"></script>
   </body>
 </html>
~~~

html的内容如何与vue3中的逻辑代码进行绑定？依靠的是Vue项目工程main.js文件汇总

~~~js
import App from './App.vue'


// 处理vue中组件逻辑内容，再挂载到真实dom节点上
createApp(App).mount('#app')                                
~~~

先不关心`createApp`和`mount`函数的实现。createApp接受的参数`App`就是通常在vue项目工程主文件的`App.js`中，通常也是vue项目的主入口：

~~~vue
export default {
    setup() {
        return {}
    }
}

 <template>
  <div>
   	hello mini-vue!
  </div>
</template>
~~~

vue3提供`render`和`h函数`，用于编程式地创建组件虚拟DOM树的函数，解析和创建`vnode`节点。

本文中单文件组件不在template中写，这需要编译能力，而是直接在render函数中实现

~~~js
 // 第二种方式
export const App = {
  render() {
    return h("div", "hi, " + this.msg)
  },

  setup() {
    // composition api

    return {
      msg: 'mini-vue'
    }
  }
}
~~~

<img src="C:\Users\MSK\AppData\Roaming\Typora\typora-user-images\image-20221202133657665.png" alt="image-20221202133657665" style="zoom: 200%;" />

### createApp

`createApp(App).mount("#app")`

在createApp中，接受App单文件组件内容（App.js），需要返回一个对象，这个对象有一个mount方法，会把单文件组件先转化为虚拟节点，后续所有逻辑也都基于虚拟节点处理，最后将其挂载到根节点上

~~~ts
export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      // 先把所有东西转化为虚拟节点vnode
      // 后续所有逻辑操作基于 vnode 处理

      const vnode = createVNode(rootComponent)

      render(vnode, rootContainer);
    }
  }
}
~~~

### createVNode

createVNode用于创建虚拟节点，`type`描述节点对象，`props`描述属性，`children`描述子节点

~~~ts
export function createVNode(type, props?, children?) { // ?表示可选参数
  const vnode = {
    type,
    props,
    children
  };

  return vnode
}
~~~

### render & patch

render函数为处理和渲染 vnode 的入口函数

patch函数为处理节点类型的中转站，此时只增加`component`的逻辑：

~~~ts
export function render(vnode, container) {

  // 调用patch方法（方便后续递归处理）
  patch(vnode, container)
}

 const patch = function(vnode, container) {
   // 调用processComponent函数，对component的vnode进行处理
   processComponent(vnode, container)
 }
~~~

### processComponent

继续调用mountCompount对组件解析

~~~js
 const processComponent = function(vnode, container) {
   mountComponent(vnode, container)
 }
~~~

### mountComponent

用于拆解组件，组件中有`setup()`和`render() {}`

所以`mountComponent`首先要执行`setup`，setup的返回值是dom中需要触发、渲染用到的数据。再对`render`函数中`h`函数返回的vnode进行处理和渲染

~~~ts
function mountComponent(vnode, container) {
  // 创建组件实例
  const instance = createComponentInstance(vnode);
  // 处理setup  
  setupComponent(instance)
  // 处理render
  setupRenderEffect(instance, container)
}
~~~

------ 分割线 下面为一系列的`componet`处理函数 ------

`component.ts`

#### createComponentInstance

createComponentInstance用于创建额包装一个component对象，挂载属性，便于后续处理

~~~js
function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        // 用于保存setup函数执行结果
        setupState: {}
    }

	return component
}
~~~

#### setupComponent

继续调用setupStatefulComponent对setup函数处理

~~~ts
function setupComponent(instance) {
    setupStatefulComponent(instance)
}
~~~

#### setupStatefulComponent

调用setup函数，保存执行结果

~~~js
function setupStatefulComponent(instance) {
    // 如果使用component组件来初始化vnode，整个组件对象会保存在type中
    const component = instance.type
    const { setup } = component
    
    if (setup) {
        // 执行setup
        const setupResult = setup()
        // 调用handleSetupResult处理
        handleSetupResult(instance, setupResult)
    }
}
~~~

需要注意的是，关于在什么地方获取`setup`，如果使用`component`来初始化`vnode`，整个的组件对象会保存在`vnode`的`type`中，这一点是和`element`有区别的。可以看一下`createVNode`函数的实现和调用逻辑。

#### handleSetupResult

保存setup函数的执行结果，便于后续应用

~~~ts
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === 'object') {
        // 将执行结果设置到ocmponent的实例中
        instance.setupState = setupResult
    }
    // 取得vnode中的render函数，保存到component的实例中，相当于解构，少一层访问
    instance.render = instance.type.render
}
~~~

------ 分割线 `component`类型调用结束 ------

### setupRenderEffect

开始调用vnode中的render函数，处理vnode节点

~~~ts
const 
~~~

