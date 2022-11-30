import { isReadonly, shallowReadonly } from "../reactive"


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