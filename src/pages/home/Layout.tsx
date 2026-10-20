import { Markdown } from "~/components"
import { HomeBackground } from "~/components/home-background"
import { useTitle } from "~/hooks"
import { getSetting } from "~/store"
import { notify } from "~/utils"
import { Body } from "./Body"
import { Footer } from "./Footer"
import { Header } from "./header/Header"
import { Toolbar } from "./toolbar/Toolbar"

const Index = () => {
  useTitle(getSetting("site_title"))
  const announcement = getSetting("announcement")
  if (announcement) {
    notify.render(<Markdown children={announcement} />)
  }
  return (
    <HomeBackground>
      <Header />
      <Toolbar />
      <Body />
      <Footer />
    </HomeBackground>
  )
}

export default Index
