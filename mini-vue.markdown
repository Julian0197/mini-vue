# mini-vue3实现
## setup环境-集成jest做单元测试
### 初始化项目
+ `yarn init -y` 初始化项目
+ `npx tsc --init` 生成tsconfig
+ `yarn add jest @types/jest --dev` 添加jest
#### npm和yarn

都是包管理工具，包是Nodejs中的第三方模块。

+ node_moudles：存放已安装到项目的包，`require()`导入第三方包，是从这个目录查找并加载包的。
  + 开发依赖：devDependencies节点中的，只有在开发阶段用到，项目上线后不使用
  + 核心依赖：dependencies节点中的包，开发和上线都使用
+ package-lock.json：记录node_moudles目录下每一个包的名字、版本号等
  + `npm init -y`创建package.json快捷指令

##### npm install流程

`npm install`执行后，会先检查获取`npm配置`，优先级为：

项目级的.npmrc文件 > 用户级的 .npmrc文件 > 全局级的 .npmrc > npm内置的 .npmrc 文件

然后检查项目中是否含有`package-lock.json`

+ 如果有, 检查 `package-lock.json`和 `package.json`声明的依赖是否一致：

  - 一致, 直接使用`package-lock.json`中的信息,从网络或者缓存中加载依赖
  - 不一致, 最新的Npm v5.4.2以上，当package-lock.json和package.json声明的版本依赖兼容，就根据package-lock.json安装依赖；两者不兼容，按照package.json安装依赖，并更新package-lock.json

+ 如果没有，会根据`package.json`递归构建依赖树

+ 然后就会根据构建好的依赖去下载完整的依赖资源,在下载的时候,会检查有没有相关的资源缓存:

  - 存在, 直接解压到`node_modules`文件中
  - 不存在, 从npm远端仓库下载包,校验包的完整性,同时添加到缓存中,解压到 `node_modules`中

  最后, 生成 `package-lock.json` 文件

  其实, 在我们实际的项目开发中，使用npm作为团队的最佳实践: `同一个项目团队,应该保持npm 版本的一致性`。

##### yarn安装包机制

1. 检测包

   主要检测项目中是否存在npm相关文件，比如：`package-lock.json`，如果有会提示用户注意，因为这些文件可能存在冲突。也会检测OS、CPU等信息

2. 解析包

   解析依赖树中每一个包的信息

   首先获取**首层依赖**：也就是当前所处项目中`package.json`中定义的`dependencies`,`devDependencies`,`optionalDependencies`(可选依赖，当一些依赖安装失败，使用这个)

   紧接着会采用**遍历首层依赖的方式来获取包的依赖信息**，递归查找每个依赖下嵌套依赖的版本信息，并将解析过的包和正在解析的包用`Set数据结构`存储，这样可以保证`同一版本范围内的包`不会重复

   **举个例子**

   - 对于没有解析过的包A, 首次尝试从 `yarn.lock`中获取版本信息,并且标记为已解析
   - 如果在`yarn.lock`中没有找到包A， 则向`Registry`发起请求获取满足版本范围内的已知的最高版本的包信息,获取之后将该包标记为已解析。

3. 获取包

   先检查缓存中是否有当前依赖的包，同时将缓存中不存在的包下载到缓存目录中

   + yarn如何判断缓存中有当前依赖包？

     **根据 cacheFolder+slug+node_modules+pkg.name 生成一个路径;判断系统中是否存在该path,如果存在证明已经有缓存,不用重新下载。这个path也就是依赖包缓存的具体路径。**

   + 如果缓存中没有依赖的包？

     yarn中存在一个`fetch队列`，会按照具体规则进行网络请求：

     + 如果下载的包是file协议或者相对路径，说明指向一个本地目录，调用Fetch From Local从离线缓存中获取
     + 否则调用 Fetch Frin External获取包，最终获取的结果要写到缓存目录中

4. 链接包

   上一步将依赖放入了缓存目录中，下一步需要将依赖复制到`node_modules`目录下，但是要遵循**扁平化原则**：yarn复制依赖之前，会先解析`peerDependencies`，这个表示**同版本的依赖**（简单一点说就是: 如果你已经安装我了, 那么你最好也安装我对应的依赖），如果找不到符合要求的`peerDepdencies`的包,会有 `warning`提示，并最终拷贝依赖到项目中。

5. 构建包

   如果依赖包中存在二进制包需要进行编译，那么会在这一步进行。

**yarn的一些优势**：

+ **确定性**yarn-lock机制，采用的是自定义标记不是json格式（npmV5也有），即使是不同的安装顺序,相同的依赖关系在任何的环境和容器中,都可以以相同的方式安装。
+ **采用模块扁平化的安装模式:** 目前npm也有，将不同版本依赖包，按照一定策略归结为一个版本，避免创建多个版本造成工程冗余
+ **网络性能更好:**`yarn`采用了请求排队的理念,类似于并发池连接,能够更好的利用网络资源;同时也引入了一种安装失败的重试机制
+ **采用缓存机制,实现了离线模式** (目前的npm也有类似的实现)

### jest单元测试

`TDD`：测试驱动开发，先编写测试代码，使得所有测试代码都通过后，再编写逻辑代码。

单元测试：对软件中最小可测单元进行检查，在前端可以理解为一个独立的模块文件

**jest使用：**

`yarn add --dev jest` 

比如，写了一个两数之和的测试用例，创建了一个sum.js的文件

~~~js
function sum(a, b) {
    return a + b;
}
module.exports = sum;
~~~

然后创建名为sum.test.js的文件

~~~js
const sum = require('./sum')

test('add 1 + 2 = 3', () => {
    expect(sum(1, 2)).toBe(3);
});
~~~

在package.json中，添加下列配置，就可以使用`yarn test`

~~~json
{
    "scripts": {
        "test": "jest"
    }
}
~~~



上述模块化采用CommonJS规范，下面是ESM规范

~~~js
import { moudle } from "";
it("init", () => {
  expect(add(1, 1)).toBe(2);
});
~~~
单元测试失败：jest默认运行在nodejs环境，node下默认模块规范是CommonJS规范，现在使用的是**ESM规范**，要使用Babel转换。

安装相应的Babel依赖，切换模块规范以及typescript。

#### CommonJS 和 ES6 模块规范

##### 模块差异

+ CommonJS模块输出的是值的**拷贝**，ES6模块输出的是值的**引用**
+ CommonJS模块是**运行时**加载，ES6模块是**编译时**就输出接口
+ CommonJS模块的`require()`是同步加载模块，ES6的`import`是异步加载，有一个独立的模块依赖的解析阶段。

**第二个差异**，因为CommonJS加载的是一个对象`moudle.export = {}`，只有在脚本运行完毕才会生成，而ES6模块不是对象，它的对外接口只是一种静态定义`export function foo()`，在代码静态解析阶段就会生成。

**第一个差异**，CommonJS模块输出的是值的拷贝，一旦输出一个值，模块内部的变化就影响不到这个值，除非写成一个函数。ES6模块遇到`import`命令，生成一个只读引用，等到脚本真正执行，再根据引用，到被加载的模块中去取值。原始值变了，`import`加载的值也会跟着变。下面代码表明，ES6 模块**不会缓存运行结果**，而是**动态**地去被**加载**的模块取值，并且**变量总是绑定其所在的模块**

~~~js
// m1.js
export var foo = 'bar';
setTimeout(() => foo = 'baz', 500);

// m2.js
import {foo} from './m1.js';
console.log(foo);
setTimeout(() => console.log(foo), 500);

$ babel-node m2.js

bar
baz
~~~

ES6模块输入的模块变量，是只读的，如果对他进行赋值会报错

~~~js
// lib.js
export let obj = {};

// main.js
import { obj } from './lib';

obj.prop = 123; // OK
obj = {}; // TypeError
~~~

变量obj的地址是只读的，不能重新赋值

最后，`export`通过接口输出的是同一个值，不同脚本加载这个接口，得到**相同的实例**。

##### CommonJS模块加载原理

`require`命令第一次加载该脚本，就会执行整个脚本，然后在内存中生成一个对象

~~~js
{
  id: '...',
  exports: { ... },
  loaded: true,
  ...
}
~~~

+ `id`是模块名
+ `exports`是模块输出的各个接口
+ `loaded`表示该模块脚本是否执行完毕

下次用该模块会从，`exports`中取值，脚本只会在第一次执行时加载，以后再加载只会返回第一次结果（触发清楚缓存）

## effect & reactive依赖收集和触发依赖
### vue3响应式原理

下面是最简单的响应式实现，使用`proxy`，在对象被读取时收集effect到一个仓库，在对象的值被设置时触发仓库中函数

~~~js
// 定义一个仓库，存储触发函数
let store = new Set()
// proxy代理data
let data_proxy = new Proxy(data, {
    get(target, key) {
        // 收集依赖
        store.add(effect)
        return target[key]
    },
    set(target, key, newVal) {
        target[key] = newVal
        store.forEach(fn => fn())
    }
})
~~~

问题：如何触发对象的读取操作，从而实现依赖收集。

解决：**直接调用一次`effect`，在effect中会用到所有相关属性，从而触发setter操作，来收集依赖**

~~~js
// 定义一个对象
let data = {
  name: 'pino',
  age: 18
}

let nextVal;
function effect() {
    // 在这收集依赖
    nextVal = data_proxy.age + 1
    console.log(nextVal)
}
// 立即执行依赖函数
effect() //19

setTimeout(() => {
    // 触发setter，data[age]变为19，,再调用store中的effect，打印nextVal 19 + 1 = 20
    data_proxy.age++ // 2秒后输出20
}, 2000)
~~~

**完善：**

1. `effect`函数被固定

   **抽离一个公共方法，依赖函数由用户来传递**

   ~~~Js
   // effect接受一个函数，把这个匿名函数当作依赖函数
   function effect(fn) {
     // 执行依赖函数
     fn()
   }
   
   // 使用
   effect(()=>{
     nextVal = data.age + 1
     console.log(nextVal)
   })
   ~~~

   虽然执行了fn函数，但是get函数内部无法收集依赖fn。

   **使用一个全局变量`activeEffect`保存当前正在处理的依赖函数fn**

   ~~~js
   let activeEffect // 新增
   
   function effect(fn) {
       activeEffect = fn // 保存到全局变量
       fn() // 执行依赖函数
   }
   
   // get内部只要收集activeEffect
   get(target, key) {
       store.add(activeEffect)
       return target[key]
   }
   ~~~

2. 对象有多个属性，如何建立响应式连接？

   **需要建立仓库和目标属性之间的关系**	

   <img src="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d7c830761e764e60bdda99b8b685844f~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?" alt="image.png" style="zoom:80%;" />

   ~~~js
   // 封装reactive函数，返回数据的代理Proxy
   function reactive(obj) {
       return new Proxy(obj, {
   		get(target, key) {
               // 收集依赖
               track(target, key)
               return target[key]
           },
           set(target, key, newVal) {
               target[key] = newVal
               // 触发依赖
               trigger(target, key)
           }
       })
   }
   ~~~

   ~~~js
   // 收集依赖
   function track(target, key) {
       // 若没有依赖函数，不需要收集依赖，直接return
       if(!activeEffect) return
       
       // 先获取target，对象名，上面例子的data
       let depsMap = store.get(target)
       if (!depsMap) {
           store.set(target, depsMap = new Map())
       }
       
       // 再获取对象中的key，对应name或者age
       let deps = depsMap.get(key)
       if(!deps) {
           depsMap.set(key, deps = new Set())
       }
       // 收集依赖
       deps.add(activeEffect)
   }
   ~~~

   ~~~js
   // 触发依赖
   function trigger(target, key) {
       // 取出对象对应的Map
       let depsMap = store.get(target)
       if (!depsMap) return
       // 取出key对应的Set
       let deps = depsMap.get(key)
       // 执行所有依赖函数
       deps && deps.forEach(fn => fn())
   }
   ~~~

   **为什么将store设置为`WeekMap`而不是`Map`？**

   + WeekMap只接受**对象作为键名**（null除外）
   + WeekMap的**键名所指向的对象是弱引用，垃圾回收机制不会考虑这个引用。**当所引用的对象的其他引用被清除，垃圾回收机制就会释放内存。也就是说，一旦不再需要，`WeakMap` 里面的键名对象和所对应的键值对会自动消失，不用手动删除引用。如果我们上文中`target`对象没有任何引用了，那么说明用户已经不需要用到它了，这时垃圾回收器会自动执行回收，而如果使用`Map`来进行收集，那么即使其他地方的代码已经对`target`没有任何引用，这个`target`也不会被回收。

   **为什么使用Reflect操作数据**

   ~~~js
   function reactive(obj) {
    return new Proxy(obj, {
      get(target, key, receiver) {
        track(target, key)
        // 使用Reflect.get操作读取数据
        return Reflect.get(target, key, receiver)
      },
      set(target, key, value, receiver) {
        trigger(target, key)
        // 使用Reflect.set来操作触发数据
        Reflect.set(target, key, value, receiver)
      }
    })
   }
   ~~~

   + 使用`Reflect.get(target, key, receiver)`可以传递receiver，相当于this

     ~~~js
     var myObject = {
     	foo: 1,
     	bar: 2,
     	get baz() {
             return this.foo + this.bar;
         }    
     };
     
     var myReceiverObject = {
     	foo: 4,
     	bar: 4,
     };
     
     Reflect.get(myObject, 'baz', myReceiverObject) // 8
     ~~~

   + 修改某些Object方法的返回结果，让语义更加规范化

     比如使用Proxy代理对象obj，当通过代理对象修改obj上的不可修改属性时，会抛出`TypeError`阻塞后面的代码，需要使用`try...catch`捕获。而使用`Reflect.set`返回false，代码正常执行。

##### 基础版响应式

~~~js
// 定义仓库
let store = new WeakMap()
// 定义当前处理的依赖函数
let activeEffect

function effect(fn) {
  // 将操作包装为一个函数
  const effectFn = ()=> {
    activeEffect = effectFn
    fn()
  }
  effectFn()
}

function reactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      // 收集依赖
      track(target, key)
      return Reflect.get(target, key, receiver)

    },
    set(target, key, newVal, receiver) {
      // 触发依赖
      trigger(target, key)
      Reflect.set(target, key, newVal, receiver)
    }
  })
}

function track(target, key) {
  // 如果没有依赖函数，则不需要进行收集。直接return
  if (!activeEffect) return

  // 获取target，也就是对象名
  let depsMap = store.get(target)
  if (!depsMap) {
    store.set(target, (depsMap = new Map()))
  }
  // 获取对象中的key值
  let deps = depsMap.get(key)

  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  // 收集依赖函数
  deps.add(activeEffect)
}

function trigger(target, key) {
  // 取出对象对应的Map
  let depsMap = store.get(target)
  if (!depsMap) return
  // 取出key所对应的Set
  const effects = depsMap.get(key)
  // 执行依赖函数
  // 为避免污染，创建一个新的Set来进行执行依赖函数
  let effectsToRun = new Set()

  effects && effects.forEach(effectFn => {
      effectsToRun.add(effectFn)
  })

  effectsToRun.forEach(effect => effect())
}
~~~



