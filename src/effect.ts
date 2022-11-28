class ReactiveEffect {
  private _fn: any;
  // ?表示可有可无的参数 public外部可以获取到
  constructor(fn, public scheduler?) {
    this._fn = fn;
  }
  run() {
    // this指向当前的实例对象_effect
    activeEffect = this;
    return this._fn();
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

  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}

let activeEffect;
export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  _effect.run();

  // 以当前的effect实例作为this
  return _effect.run.bind(_effect)
}
