import { createRenderer } from "../../lib/mini-vue.esm.js"
import { App } from "./App.js"
// console.log(PIXI);


const game = new PIXI.Application({
  width: 500,
  height: 500
})

document.body.append(game.view)

const renderer = createRenderer({
  createElement(type) {
    // PIXI创建矩形
    if (type === "rect") {
      const rect = new PIXI.Graphics();
      rect.beginFill(0xdd0000)
      rect.drawRect(0, 0, 100, 100)
      rect.endFill()

      return rect
    }
  },
  patchProp(el, key, val) {
    el[key] = val
  },
  insert(el, parent) {
    parent.addChild(el)
  }
})

// 本来是挂载到div上的，现在挂载到game.stage
renderer.createApp(App).mount(game.stage)



// const rootContainer = document.querySelector("#app")
// createApp(App).mount(rootContainer);