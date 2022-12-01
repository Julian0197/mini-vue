import { extend } from "./shared";

let activeEffect;
let shouldTrack;

export class ReactiveEffect {
  private _fn: any;
  deps = [];
  active = true;
  onStop?: () => void;
  // ?表示可有可无的参数 public外部可以获取到
  constructor(fn, public scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }

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

  stop() {
    if (this.active) {
      cleanupEffect(this);
      if (this.onStop) {
        this.onStop();
      }
      this.active = false;
    }
  }
}

function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    // dep是target[key]的Set()
    // 要删除所有dep库中的当前_effect对象
    dep.delete(effect);
  });
  effect.deps.length = 0;
}

// 依赖收集
const targetMap = new Map();
export function track(target, key) {
  if (!isTracking()) return;

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

  trackEffects(dep)
}

// 重构针对ref和reactive对象都可以使用
export function trackEffects(dep) {
  // // 如果当前依赖已经收集，不需要再收集了
  if (dep.has(activeEffect)) return;
  dep.add(activeEffect)
  // 反向收集，用effect收集dep
  activeEffect.deps.push(dep)
}


// 抽离effect.stop后的几个逻辑
export function isTracking() {
  return shouldTrack && activeEffect !== undefined
  // if (!activeEffect) return; // 当前没有执行过effect，没有收集依赖
  // if (!shouldTrack) return; // 当前收集依赖通过stop方法暂停了
}



// 依赖触发
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let dep = depsMap.get(key);

  triggerEffects(dep)
}

export function triggerEffects(dep) {
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
} 


export function effect(fn, options: any = {}) {
  // options写成对象因为还有很多其他配置
  const _effect = new ReactiveEffect(fn, options.scheduler);

  // _effect.onStop = options.onStop;
  // Object.assign(_effect, options);
  extend(_effect, options);

  _effect.run();

  // 以当前的effect实例作为this
  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}

export function stop(runner) {
  runner.effect.stop();
}
