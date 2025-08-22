import markdownIt from "markdown-it"
import configOptions, {init} from "@github/markdownlint-github"

const markdownItFactory = () => markdownIt({ html: true })

const options = {
    config: init(),
    customRules: ["@github/markdownlint-github"],
    markdownItFactory,
    outputFormatters: [
      [ "markdownlint-cli2-formatter-pretty", { "appendLink": true } ]
    ]
}

export default options
