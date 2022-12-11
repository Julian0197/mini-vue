import { computed } from "../computed";
import { reactive } from "../reactive";

describe("computed", () => {
  it("happy path", () => {
    const user = reactive({
      age: 1,
    });

    const age = computed(() => {
      return user.age;
    });

    expect(age.value).toBe(1);
  });

  it("should compute lazily", () => {
    const value = reactive({
      foo: 1,
    });
    const getter = jest.fn(() => {
      return value.foo;
    });
    const cValue = computed(getter);

    // lazy 懒执行，如果没有调用cValue.value，getter不会执行
    expect(getter).not.toHaveBeenCalled();

    expect(cValue.value).toBe(1);
    expect(getter).toHaveBeenCalledTimes(1);

    // should not compute again
    // computed有缓存，当再次调用cValue.value，getter不会被执行
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(1);

    // should not computed until needed
    // 当响应式数据发生改变，computed还会执行一遍
    value.foo = 2; // trigger => effect
    expect(getter).toHaveBeenCalledTimes(1);
    expect(cValue.value).toBe(2);

    // now it should compute
    expect(cValue.value).toBe(2);
    expect(getter).toHaveBeenCalledTimes(2);

    // should not computed again
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(2);
  });
});
