import { reactive } from "../reactive";
import { effect } from "../effect";

describe("effect", () => {
  it("happy path", () => {
    // 创建响应式对象user
    const user = reactive({
      age: 10,
    });

    let nextAge;
    effect(() => {
      nextAge = user.age + 1;
    });

    expect(nextAge).toBe(11);

    // 触发依赖
    user.age++;
    expect(nextAge).toBe(12);
  });

  it("should return runner when call effect", () => {
    // 调用effect(fn)，返回runner函数，调用runner，执行fn
    let foo = 10;
    const runner = effect(() => {
      foo++;
      return "foo";
    });

    expect(foo).toBe(11);
    const r = runner();
    expect(foo).toBe(12);
    expect(r).toBe("foo");
  });

  it("scheduler", () => {
    let dummy;
    let run: any;
    const scheduler = jest.fn(() => {
      run = runner;
    })

    const obj = reactive({foo: 1})
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      { scheduler }
    );
    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);
    obj.foo++;
    // 希望trigger不调用effect，而是执行scheduler
    expect(scheduler).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(1);
    // run函数执行effect函数的返回值
    run();
    expect(dummy).toBe(2)
  })
});
