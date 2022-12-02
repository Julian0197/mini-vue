# mini-vue3实现（1）
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

#### 基础版响应式

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

#### 嵌套effect

实际工作中，比如vue的渲染函数中，各个组件嵌套关系，组件中使用的`effect`是必然会发生嵌套的

~~~js
effect(() => {
    Father.render()
    
    // 嵌套子组件
    effect(() => {
        Son.render()
    })
})
~~~

比如，下方代码：foo的依赖函数中嵌套了bar的依赖函数

+ 先执行effect1函数，activeEffect被赋值为effect1
+ 再执行effect2函数，activeEffect被赋值为effect2
+ effect2函数内调用了obj.bar，触发了obj的getter函数，将当前activeEffect添加到bar的依赖函数库中
+ 执行完effect2，继续执行effect1，调用了obj.foo，触发了obj的getter函数，将当前activeEffect（其实是effect2）添加到foo的依赖函数库中
+ 依赖收集后，执行`obj.foo = '前来买瓜'`，触发了obj的setter函数，调用foo的依赖函数库，相当于又执行了effect2

~~~js
const data = { foo: 'pino', bar: '在干啥' }
// 创建代理对象
const obj = reactive(data)

let p1, p2;
// 设置obj.foo的依赖函数
effect(function effect1(){
  console.log('effect1执行');
  // 嵌套，obj.bar的依赖函数
  effect(function effect2(){
    p2 = obj.bar

    console.log('effect2执行')
  })
  p1 = obj.foo
})

// 修改obj.foo的值
obj.foo = '前来买瓜'
~~~

<img src="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/11ff0565e88140af8381ea563200ca2e~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?" alt="image_1659170045716_0.png" style="zoom:80%;" />

**解决：使用函数栈（先进后出），将`activeEffect`指向栈顶的依赖函数**

~~~js
// 增加effect调用栈
const effectStack = [];

function effect(fn) {
    let effectFn = function() {
        activeEffect = effectFn
        // 入栈
        effectStack.push(effectFn)
        // 执行fn时收集依赖activeEffect
		fn()
        // 收集完后再出栈
        effectStack.pop()
        // activeEffect重新指向栈顶
        activeEffect = effectStack[effectStack.length - 1] 
    }
    effectFn()
}
~~~

 #### 避免无限循环

如果`effect`函数改为下面代码：会出现栈溢出

~~~js
// 定义一个对象
let data = {
  name: 'pino',
  age: 18
}
// 将data更改为响应式对象
let obj = reactive(data)

effect(() => {
  obj.age++
})

// uncaught RangeError: Maximum call stack size exceeded
~~~

`obj.age++`相当于执行了`obj.age = obj.age + 1`

+ 读取obj.age，触发track收集了当前effect函数
+ 紧接着给obj.age赋值，触发trigger将继续执行effect函数
+ 但是此时该依赖函数正在执行中，还没有执行完就要再次开始下一次的执行。就会导致无限的递归调用自己。

**解决：在触发trigger前，判断当前取出的依赖函数是否等于`activeEffect`就可以避免重复执行一个函数**

~~~js
function trigger(target, key) {
    let depsMap = store.get(target)
    if (!depsMap) return
    const effects = depsMap.get(key)
    let effectsToRun = new Set()
    effects && effects.forEach(effectFn => {
        if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
        }
    })
    
    effectsToRun.forEach(effect => effect())
}
~~~

---

**本项目mini-vue中reactive和effect实现：**

~~~js
 class ReactiveEffect{
  private _fn:any;
  constructor(fn){
    this._fn = fn;
  }
  run(){
    activeEffect = this;
    this._fn();
  }
}

const targetMap = new Map();
export function track(target,key){
  // target -> key -> dep
  let depsMap = targetMap.get(target);
  if(!depsMap){
    depsMap = new Map();
    targetMap.set(target,depsMap);
  }
  let dep = depsMap.get(key);
  if(!dep){
    dep = new Set();
    depsMap.set(key,dep)
  }
  dep.add(activeEffect);
}
export function trigger(target,key){
  let depsMap = targetMap.get(target);
  let dep = depsMap.get(key);
  for(const effect of dep){
    effect.run();
  }
}

let activeEffect;
export function effect(fn){
  const _effect = new ReactiveEffect(fn);
  _effect.run();
}
~~~

## 实现effect返回runner

effect函数会返回一个function，我们称为runner，当调用这个runner时会执行传入的fn，并返回fn的值

**测试案例：**

~~~js
// effect.spec.ts

it( 'should return render when call effect', () => {
        //  effect(fn) -> function(render) -> fn -> return
        // 调用effect返回一个function，runner。 调用runner的时候会再次执行fn，当调用fn的时候 返回fn的返回值
        let foo = 10
        const runner:any = effect( () => {
            foo++
            return "foo"
        })
        expect(foo).toBe(11) // 测试执行foo++

        const r = runner() 
        expect(foo).toBe(12) // 当获取返回值的时候，是否再次执行
        expect(r).toBe("foo") // 判断返回值是否是fn函数内的 return
    })
~~~

因为需要一个返回值，所以直接在effect方法里返回 _effect.run 方法

```js
 export function effect(fn) {
    // fn
    const _effect = new ReactiveEffect(fn)
    _effect.run()
    return _effect.run.bind(_effect) // 这里的bind处理的是返回当前函数，所以做了个bind处理
}
```

而ReactiveEffect 类里需要改一下run，直接返回绑定的当前fn

```js
class ReactiveEffect {
    private _fn: any
    constructor(fn){
        this._fn = fn
    }
    run(){
        activeEffect = this
        return this._fn()
    }
}
```

## 完善effect的scheduler方法

scheduler调度器，用来执行一些**异步、周期性任务**

1. 通过effect的第二个参数给定一个 scheduler 的fn
2. effect 会执行fn
3. 当响应式对象 set update的时候不会执行fn 而是执行第二个参数 scheduler函数
4. 然后执行runner的时候，会再次执行 fn

~~~js
it( 'scheduler', () => {
        let dummy
        let run: any
        const scheduler = jest.fn( () => {
            run = runner
        })
        const obj = reactive( { foo: 1 } )
        const runner = effect( () => {
            dummy = obj.foo
        }, { scheduler })
        expect(scheduler).not.toHaveBeenCalled()
        expect(dummy).toBe(1)
        // should be called on first trigger
        obj.foo++
        expect(scheduler).toHaveBeenCalledTimes(1)
        // should not run yet
        expect(dummy).toBe(1)

        // manually run 手动执行run
        run()
        // should have run
        expect(dummy).toBe(2)
    })
~~~

希望传入scheduler后，触发trigger时，绕过fn，直接执行scheduler。在trigger最后那个判断effect是否有scheduler属性

~~~ts
export function trigger(target: any, key: string | symbol) {
    let depsMap = targetMap.get(target)
    let dep = depsMap.get(key)
     for (const effect of dep) {
         // 判断effect是否哟scheduler方法
         if( effect.scheduler ) {
            effect.scheduler()
         } else {
            effect.run()
         }
     }
}
~~~

effect传入options，在ReactiveEffect构造函数中要设置第二个参数为options对象的scheduler方法

```ts
export function effect(fn, options: any = {}) {
    // fn
    const _effect = new ReactiveEffect(fn, options?.scheduler)
    _effect.run()
    return _effect.run.bind(_effect)
}
```

~~~ts
class ReactiveEffect {
    private _fn: any
    // ?表示可有可无的参数 public外部可以获取到
    constructor(fn: any, public scheduler?: any){
        this._fn = fn
    }
    run(){
        activeEffect = this
        return this._fn()
    }
}
~~~

### jest中的Mock函数

创建Mock函数帮助我们测试项目中一些逻辑复杂的代码，例如：函数的嵌套调用等。在单元测试中，我们有时函数调用的结果和执行过程，只想知道它是否被正确调用。

Mock函数提供以下三种特性：

+ 捕获函数的调用情况
+ 设置函数的返回值
+ 改变函数的内部实现

`jest.fn()`、`jest.spyOn()`、`jest.mock()`三种API用于创建Mock函数



**jest.fn()创建mock函数**

最简单创建Mock函数的方法，如果没有定义函数内部实现方式，返回`undefined`

~~~js
test('测试jest.fn()调用', () => {
  let mockFn = jest.fn();
  let result = mockFn(1, 2, 3);

  // 断言mockFn的执行后返回undefined
  expect(result).toBeUndefined();
  // 断言mockFn被调用
  expect(mockFn).toBeCalled();
  // 断言mockFn被调用了一次
  expect(mockFn).toBeCalledTimes(1);
  // 断言mockFn传入的参数为1, 2, 3
  expect(mockFn).toHaveBeenCalledWith(1, 2, 3);
})
~~~

`jest.fn()`所创建的Mock函数还可以**设置返回值**，**定义内部实现**或**返回`Promise`对象**。

~~~js
test('测试jest.fn()返回固定值', () => {
  let mockFn = jest.fn().mockReturnValue('default');
  // 断言mockFn执行后返回值为default
  expect(mockFn()).toBe('default');
})

test('测试jest.fn()内部实现', () => {
  let mockFn = jest.fn((num1, num2) => {
    return num1 * num2;
  })
  // 断言mockFn执行后返回100
  expect(mockFn(10, 10)).toBe(100);
})

test('测试jest.fn()返回Promise', async () => {
  let mockFn = jest.fn().mockResolvedValue('default');
  let result = await mockFn();
  // 断言mockFn通过await关键字执行后返回值为default
  expect(result).toBe('default');
  // 断言mockFn调用后返回的是Promise对象
  expect(Object.prototype.toString.call(mockFn())).toBe("[object Promise]");
})
~~~

## 实现effect的stop和onStop功能

**`stop(runner)`可以删除当前dep中的runner（也就是effect返回的function）**

~~~js
it( 'stop', () => {
    let dummy: unknown
    const obj = reactive( { prop: 1 } )
    const runner = effect( () => {
        dummy = obj.prop
    })
    obj.prop = 2
    expect(dummy).toBe(2)
    // 执行stop 阻止runner的执行
    stop(runner)
    obj.prop = 3
    expect(dummy).toBe(2)

    // stoped effect should still be manually 			callable
    runner()
    expect(dummy).toBe(3)
})
~~~

实现上述测试功能

1. 在effect中导出`stop(runner)`，给runner设置为any，并添加effect属性，存储当前_effect对象，本身runner是\_effect中fn的执行结果

   ~~~ts
   // effect.ts
   
   export function effect(fn, options: any = {}) {
     // 新增  
     // 以当前的effect实例作为this
     const runner: any =  _effect.run.bind(_effect);
     runner.effect = _effect;
     return runner;
   }
   
   export function stop(runner) {
     runner.effect.stop()
   }
   ~~~

2. 要找到有哪些target[key]的 dep库存储了当前_effect，在track中反向收集

   ~~~ts
   // track
   
   dep.add(activeEffect)
   activeEffect.deps.push(dep) // 反向收集
   
   // class ReactiveEffect
   // 新增deps
   deps = []
   ~~~

3. run方法遍历deps，将每一个Set中的当前effect对象删除

   ~~~ts
   // class ReactiveEfect
     stop() {
       this.deps.forEach((dep: any) => {
         // dep是target[key]的Set()
         // 要删除所有dep库中的当前_effect对象
         dep.delete(this);
       })
     }
   ~~~

**重构一下上面代码:**

+ 封装一下 stop() 中的清除函数功能
+ 给一个状态active，如果清除过当前effect就不用再清除

~~~ts
// class ReactiveEffect
active = true;
stop() {
  if (this.active) {
    cleanupEffect(this);
    this.active = false
  }
    
// effect.ts
function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    // dep是target[key]的Set()
    // 要删除所有dep库中的当前_effect对象
    dep.delete(effect);
  })
}
~~~



**`onStop`是调用stop后的回调函数，允许调用stop后可进行其它操作**

~~~ts
it( 'onStop', () => {
    const obj = reactive({
        foo: 1
    })
    const onStop = jest.fn()
    let dummy: number
    const runner = effect( () => {
        dummy = obj.foo
    }, { onStop })
    stop(runner)
    expect(onStop).toBeCalledTimes(1)
})
~~~
new ReactiveEffect传入onStop参数

ReactiveEffect新增onStop属性，在stop函数中判断有没有onStop回调函数，有的话就调用

~~~ts
// class ReactiveEffect
onStop?: () => void

stop() {
  if (this.active) {
    cleanupEffect(this);
    if (this.onStop) {
      this.onStop();
    }
    this.active = false
  }
}
~~~

`Object.assign` 方法只会拷贝源对象 *可枚举的* 和 *自身的* 属性到目标对象

将Object.assign封装成工具函数使用

~~~ts
export function effect(fn, options: any = {}) { // options写成对象因为还有很多其他配置
  // _effect.onStop = options.onStop;
  // Object.assign(_effect, options);
  extend(_effect, options);
}
~~~

## 实现readonly

readonly包裹的数据只能get操作，不能set操作，也就不需要依赖收集和触发依赖

再写一个单元测试

~~~ts
describe("readonly", () => {
  it("happy path", () => {
    // 不能set，只能get
    const original = {foo: 1, bar: {baz: 2}};
    const wrapped = readonly(original);
    expect(wrapped).not.toBe(original)
    expect(wrapped.foo).toBe(1)
  });

  it("warn then call set", () => {
    // 验证console.warn是否被调用
    console.warn = jest.fn();
    const user = readonly({
      age: 10,
    })
    user.age = 11;
    expect(console.warn).toBeCalled()
  })
})
~~~

readonly代码实现简单，由于和reactive有高相似性，将proxy后的配置对象，包括getter和setter方法抽离出来。

~~~ts
// baseHandlers.ts

import { track, trigger } from "./effect";

// 缓存get和set方法，只需要初始化时调用一次
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);

// 抽离get
function createGetter(isReadonly = false) {
  return function get(target, key) {
    const res = Reflect.get(target, key)
    if (!isReadonly) {
      // 依赖收集
      track(target, key)
    }
    return res;
  }
}

// 抽离set
function createSetter() {
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value);
    // 触发依赖
    trigger(target, key);
    return res;
  }
}

export const mutableHandlers = {
  get,
  set
}

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key, value) {
    console.warn(`key:${key} set 失败，因为${target}是readonly`)
    return true;
  }
}
~~~

这样reactive的逻辑就比较清楚了

~~~ts
// reactive.ts

import { mutableHandlers, readonlyHandlers } from "./baseHandlers";

export function reactive(raw) {
  return createActiveObject(raw, mutableHandlers);
}

export function readonly(raw) {
  return createActiveObject(raw, readonlyHandlers);
}

// 再封装一下
function createActiveObject(raw: any, baseHandlers) {
  return new Proxy(raw, baseHandlers);
}
~~~

## 实现isReactive和isReadonly

实现isReactive只需要访问getter，在getter中根据isReadonly变量判断。

~~~ts
// 抽离is_reactive变量
export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
}

export function isReactive(value) {
        // !!转化为布尔值，如果没有触发getter，返回undefined
  return !!value[ReactiveFlags.IS_REACTIVE];
}


// baseHandlers createGetter
if (key === ReactiveFlags.IS_REACTIVE) {
  return !isReadonly;
}
~~~

isReadonly同理

## 优化effect的stop功能

在单元测试中，`stop(runner)`后，`obj.prop = 3`不再触发，但是`obj.prop++`仍然触发。

因为`obj.prop++`相当于`obj = obj.prop + 1`，会先执行set再执行get，执行set时候又会收集依赖runner，所以set又会触发依赖。

~~~ts
  it("stop", () => {
    let dummy;
    const obj = reactive({prop: 1})
    const runner = effect(() => {
      dummy = obj.prop
    });
    obj.prop = 2;
    expect(dummy).toBe(2)
    stop(runner);
    // obj.prop = 3
    obj.prop++;
    expect(dummy).toBe(2)

    // stoped effect should still be manually callable
    runner()
    expect(dummy).toBe(3)
  })
~~~

抽离track逻辑

~~~ts
// track
// 写在最前面
if (!isTracking()) return;


// 抽离effect.stop后的几个逻辑
function isTracking() {
  return shouldTrack && activeEffect !== undefined
  // if (!activeEffect) return; // 当前没有依赖收集
  // if (!shouldTrack) return; // 当前收集依赖通过stop方法暂停了
}
~~~

在run方法中利用active判断是否需要收集依赖

如果stop effect后碰上`proxy.attr++`，利用shouldTrack变量不收集effect

~~~ts
// class ReactiveEffect  
run() {
    // run方法会收集依赖
    // 用shouldTrack全局变量来做区分，是否能够触发依赖
    if (!this.active) {
      // 表明当前是effect对象是stop状态，不用收集依赖
      return this._fn();
    }

    shouldTrack = true;
    // this指向当前的实例对象_effect
    activeEffect = this;
    const result = this._fn();
    shouldTrack = false; // reset

    return result;
  }
~~~

## reactive & readonly 多层对象处理

测试用例

~~~ts
// 多层对象 进行reactive
    test("nested reactive", () => {
        const original = {
            nested: { foo: 1},
            aray: [ { bar: 2 } ]
        }
        const observed = reactive(original)
        expect(isReactive(observed)).toBe(true)
        expect(isReactive(observed.nested)).toBe(true)
        expect(isReactive(observed.aray)).toBe(true)
        expect(isReactive(observed.aray[0])).toBe(true)
    })

// 多层对象 进行readonly
    test("nested reactive", () => {
        const original = {
            nested: { foo: 1},
            foo: 3,
            aray: [ { bar: 2 } ]
        }
        const wrapped = readonly(original) 
        expect(wrapped).not.toBe(original)
        expect(isReadonly(wrapped)).toBe(true)
        expect(isReadonly(original)).toBe(false)
        expect(wrapped.foo).toBe(3)
    })
~~~

在getter中，返回res前，判断res是否是readonly或者reactive对象，如果是的话就嵌套处理。

~~~js
// 判断res是不是obj，如果是继续reactive
        if(isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res)
        }
~~~

将isOject函数封装到公共库

~~~js
export const isObject = (val) => {
    return res !== null && typeof res === 'object'
}
~~~

## 实现shallowReadonly

shallowReadonly只把外层的obj变成readonly，obj里面的对象不是readonly

创建shallowReadonly的测试用例

~~~ts
describe("shallowReadonly", () => {
  // shallowReadonlt 生成的对象最外层是readonly状态，里面的对象不是
  it("should not make non-reactive properties reactive", () => {
    const props = shallowReadonly({n: {foo: 1}})
    expect(isReadonly(props)).toBe(true)
    expect(isReadonly(props.n)).toBe(false)
  })

  it("warn then call set", () => {
    // 验证console.warn是否被调用
    console.warn = jest.fn();
    const user = shallowReadonly({
      age: 10,
    })
    user.age = 11;
    expect(console.warn).toBeCalled()
  })
})
~~~

shallowReadonly，需要在初试的getter中添加一个变量shallow判断，shallowReadonly只需要在readonly配置上修改自己的getter

~~~ts
const shallowReadonlyGet = createGetter(true, true)

// extend 相当于Object.assign(),后面可以覆盖
export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet,
})
~~~

## 实现isProxy和ref功能

isProxy：检查一个object是否是由readonly或者reactive创建出来的

~~~ts
export function isProxy(value) {
  return isReactive(value) || isReadonly(value)
}
~~~



ref：接受一个参数值（基础数据类型，也包括对象）返回一个响应式数据，ref对象拥有一个指向内部值的单一属性ref

先写测试：

测试案例较多时，如果想只跑一个：`it.only()`，跳过这个`it.skip()`

~~~ts
describe("ref", () => {
  it("happy path", () => {
    const a = ref(1);
    expect(a.value).toBe(1)
  })

  it("should be a reactibe", () => {
    const a = ref(1);
    let dummy;
    let calls = 0
    effect(() => {
      calls++;
      dummy = a.value
    });
    expect(calls).toBe(1)
    expect(dummy).toBe(1)
    a.value = 2
    expect(calls).toBe(2)
    expect(dummy).toBe(2);

    // same value should not trigger
    a.value = 2
    expect(calls).toBe(2)
    expect(dummy).toBe(2);
  });

  it("should make nested properties reactive", () => {
    const a = ref({
      count: 1,
    });
    let dummy;
    effect(() => {
      dummy = a.value.count
    });
    expect(dummy).toBe(1)
    a.value.count = 2
    expect(dummy).toBe(2)
  })
})
~~~



+ 实现一个RefImpl接口，因为只有一个数据所以只需要一个dep存放依赖
  + 需要判断数据是否为object `Object.is()`，如果是object需要转换为reactive
  + 初始化dep是一个Set()，dep是public的
  + set value时候需要比较oldValue和当前value，当前value如果用reactive包裹的话，无法分辨是否一样。使用_rawValue保存原始值，比较原始值和newValue

+ ref对象必须返回.value，所以用get value()，在get时候收集依赖
  + 重构trackEffect，传入参数为dep，需要检测如果当前activeEffect已经收集，就不需要收集，还需要注意反向收集
  + 如果没有effect过，activeEffect为undefined会报错，所以还要加个判断isTracking，判断是否有activeEffect以及是否通过stop方法终止了依赖收集

+ set方法要判断新旧值是否相同，如果不同，才需要改变值，并触发依赖
  + 比较rawValue和newValue看是否需要set
  + 修改的话，rawValue赋值newValue
  + _value还需要判断是否是对象，并进行reactive包裹
  + 最后触发依赖（也重构过，传入参数dep）


~~~ts
// ref.ts

import { isTracking, trackEffects, trigger, triggerEffects } from "./effect";
import { reactive } from "./reactive";
import { hasChanged, isObject } from "./shared";

class RefImpl {
  private _value: any;
  // 和reactive不同的是，只有一个数据，只需要一个仓库存放依赖
  public dep;
  private _rawValue: any;
  constructor(value) {   
    this._rawValue = value
    // 看看value是不是对象，是的话需要reactive包裹
    this._value = convert(value)

    this.dep = new Set();
  }
  get value() {
    // 如果没有触发effect()，activeEffect为undefined
    trackRefValue(this)

    return this._value;
  }

  set value(newValue) {
    // 判断newValue是否和旧的value不一样
    // 这里对比新旧值，是两个object对比，有可能一个是proxy
    if (!hasChanged(this._rawValue, newValue)) {
      this._rawValue = newValue
      this._value = convert(newValue)
      triggerEffects(this.dep);
    }
  }
}

function convert(value) {
  return isObject(value) ? reactive(value) : value
}


function trackRefValue(ref) {
  // 如果没有触发effect()，activeEffect为undefined
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}

export function ref(value) {
  return new RefImpl(value);
}
~~~



`Object.is()`：判断两个值是否相同

+ 与`==`不同，==在判断相等前对两边变量（如果不同类）进行强制转换，Object.is不会强制转换
+ 与`===`不同，差别是对待有符号的零和NaN不同，例如，===认为`+0`和`-0`相等，而将`Number.NaN`与`NaN`视为不等

## 实现工具函数 isRef & unRef

`isRef`

检查某个值是否为 ref。

只需要在ref接口中添加一个公共参数`__v_isRef = true`

判断是否是ref对象，需要利用`!!`将undefined转化为布尔值

~~~ts
export function isRef(value) {
  return !!value.__v_isRef
}
~~~



`unRef`

如果参数是 ref，则返回内部值，否则返回参数本身。这是 `val = isRef(val) ? val.value : val` 计算的一个语法糖。

~~~ts
export function unRef(ref) {
  // 看看是不是ref，是的话返回ref.value，不是直接返回值
  return isRef(ref) ? ref.value : ref;
}
~~~

## 实现proxyRefs功能

适用于Vue3 setup中，return的一个对象内部有ref类型数据。但是在template中访问该ref，不需要通过.value在访问值，这一功能就是通过proxyRefs实现的

测试案例

~~~ts
it("proxyRefs", () => {
  const user = {
    age: ref(31),
    name: "Macro"
  };

  const proxyUser = proxyRefs(user)
  expect(user.age.value).toBe(31)
  expect(proxyUser.age).toBe(31)
  expect(proxyUser.name).toBe("Macro")
})

~~~

区分target[key]和newValue分别是ref还是普通值的情况

~~~ts
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      // get => 如果ref就返回它的.value
      // not ref => 直接返回它
      return unRef(Reflect.get(target, key));
    },

    set(target, key, value) {
      if (isRef(target[key]) && !isRef(value)) {
        return target[key].value = value
      } else {
        return Reflect.set(target, key, value)
      }
    }
  });
}
~~~

## comouted计算属性

computed 计算属性，相当于ref 有.value，而且最重要的是计算属性有缓存

测试案例

~~~ts
describe("computed", () => {
  it("happy path", () => {
    const user = reactive({
      age: 1
    })

    const age = computed(() => {
      return user.age
    })

    expect(age.value).toBe(1)
  })

  it("should compute lazily", () => {
    const value = reactive({
      foo: 1
    })
    const getter = jest.fn(() => {
      return value.foo
    })
    const cValue = computed(getter)

    // lazy 懒执行，如果没有调用cValue.value，getter不会执行
    expect(getter).not.toHaveBeenCalled()

    expect(cValue.value).toBe(1)
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute again
    // computed有缓存，当再次调用cValue.value，getter不会被执行
    cValue.value
    expect(getter).toHaveBeenCalledTimes(1)

    // should not computed until needed
    // 当响应式数据发生改变，computed还会执行一遍
    value.foo = 2  // trigger => effect 
    expect(getter).toHaveBeenCalledTimes(1)
    expect(cValue.value).toBe(2)

    // now it should compute
    expect(cValue.value).toBe(2)
    expect(getter).toHaveBeenCalledTimes(2)

    // should not computed again
    cValue.value
    expect(getter).toHaveBeenCalledTimes(2)
  })
})
~~~

实现：

+ computed接受一个函数（getter），当返回computed类型数据的.value时，会返回相应的计算结果，并且该结果有缓存，下次再调用.value，不会触发getter
  + 在ComputedRefImpl接口中，先利用内部属性接受getter函数返回的值，并用_dirty记录是否有缓存过value，如果缓存过的话，下次直接返回这个value，不再调用getter
+ 当响应式数据改变时，会触发setter，但是由于没有effect过，depsMap是undefined会报错。所以在computed内部要执行ReactiveEffect实例。
  + 使用_effect保存effect对象，参数为getter函数，get value 时直接运行this.\_effect.run()，这时候会触发响应式数据的getter，初始化depsMap和deps并收集依赖
  + 当更新响应式数据时，会触发trigger，我们这时候不想再调用effect，因为effect.run()相当于执行comouted中的getter函数，并不会改变computed类中的value。
    + 使用scheduler，当触发trigger直接执行scheduler，然后将_dirty变为true，下一次访问.value时，就会重新执行computed 的get value并给\_value赋予新的值

~~~ts
import { ReactiveEffect } from "./effect"

class ComputedRefImpl {
  private _getter: any
  private _dirty: boolean = true
  private _value: any
  private _effect: ReactiveEffect
  constructor(getter) {
    this._getter = getter
    this._effect = new ReactiveEffect(getter, () => {
      // 如果有scheduler，trigger不会执行effect，会执行scheduler
      if (!this._dirty) {
        this._dirty = true
      }
    })
  }

  get value() {
    if (this._dirty) {
      this._dirty = false
      this._value = this._effect.run()
    }
    return this._value
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter)
}
~~~

