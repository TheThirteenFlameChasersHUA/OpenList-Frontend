import { JSX, Show, createMemo } from "solid-js"
import { getSetting, getSettingNumber } from "~/store"
import { resolveHomeBackground } from "./util"
import "./style.css"

export const HomeBackground = (props: { children: JSX.Element }) => {
  const background = createMemo(() =>
    resolveHomeBackground({
      value: getSetting("home_background"),
      blur: getSettingNumber("home_background_blur", 0),
      mask: getSettingNumber("home_background_mask", 50),
    }),
  )

  return (
    <Show when={background().active} fallback={<>{props.children}</>}>
      <div
        class="home-background"
        style={`--hb-blur:${background().blur}px;--hb-mask-alpha:${
          background().mask / 100
        };`}
      >
        <div
          class="home-background__image"
          style={{
            "background-image": background().image,
            "background-color": background().color,
          }}
        />
        <div class="home-background__mask" />
        <div class="home-background__content">{props.children}</div>
      </div>
    </Show>
  )
}

export * from "./group"
export * from "./util"
