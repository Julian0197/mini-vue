const queue: any[] = [];

// 定义是否添加任务的状态
// 每次添加job，都要创建一次Promise.resolve
// 现在设置一个状态isFlushPending，默认为false表示还没有创建过promise
// 创建完Promise立刻将状态设置为true，期间queue中如果添加了其他job，都不会再创建Promise
// 所有的job都将在一个Promise.resolve中执行
// 当前Promise执行完后，再把状态重新设置为false
let isFlushPending = false;

// 定义一个状态为成功的promise状态
const p = Promise.resolve();

// nextTick就是用Promise包裹当前fn，异步执行fn
export function nextTick(fn) {
  return fn ? p.then(fn) : p;
}

export function queueJobs(job) {
  // 添加任务，实际上是添加当前effect的fn，只需要添加一次
  if (!queue.includes(job)) {
    queue.push(job);
  }
  queueFlush();
}

function queueFlush() {
  if (isFlushPending) return;
  isFlushPending = true;
  
  nextTick(flushJobs);
}

function flushJobs() {
  isFlushPending = false;
  let job;
  while ((job = queue.shift())) {
    job && job();
  }
}
