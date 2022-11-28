import { extend } from "./shared";

class ReactiveEffect {
  private _fn: any;
  deps = [];
  active = true;
  onStop?: () => void
  // ?表示可有可无的参数 public外部可以获取到
  constructor(fn, public scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }

  run() {
    // this指向当前的实例对象_effect
    activeEffect = this;
    return this._fn();
  }

  stop() {
    if (this.active) {
      cleanupEffect(this);
      if (this.onStop) {
        this.onStop();
      }
      this.active = false
    }
  }
}

function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    // dep是target[key]的Set()
    // 要删除所有dep库中的当前_effect对象
    dep.delete(effect);
  })
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

  if (!activeEffect) return;
  // 反向收集，用effect收集dep
  activeEffect.deps.push(dep)
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
export function effect(fn, options: any = {}) { // options写成对象因为还有很多其他配置
  const _effect = new ReactiveEffect(fn, options.scheduler);

  // _effect.onStop = options.onStop;
  // Object.assign(_effect, options);
  extend(_effect, options);

  _effect.run();

  // 以当前的effect实例作为this
  const runner: any =  _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}

export function stop(runner) {
  runner.effect.stop()
}
