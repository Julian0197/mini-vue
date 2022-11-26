class ReactiveEffect {
  private _fn: any;
  constructor(fn) {
    this._fn = fn;
  }
  run() {
    // this指向当前的实例对象_effect
    activeEffect = this;
    this._fn();
  }
}

// 依赖收集
const targetMap = new Map();
export function track(target, key) {
  // target -> key -> dep(里面装依赖key的属性)
  // const dep = new Set()
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  dep.add(activeEffect)
}

// 依赖触发
export function trigger(target, key) {
  let depsMap = targetMap.get(target)
  let dep = depsMap.get(key)
  dep.forEach(effect => {
    effect.run();
  });
}

let activeEffect 
export function effect(fn) {
  const _effect = new ReactiveEffect(fn);
  _effect.run();
}
