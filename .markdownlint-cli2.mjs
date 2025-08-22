import markdownIt from "markdown-it"
import configOptions, {init} from "@github/markdownlint-github"

const markdownItFactory = () => markdownIt({ html: true })

const overriddenOptions = init({
    "no-duplicate-heading": false, // Allow duplicate headings for changelogs
    "line-length": false, // Disable line length rule
})

const options = {
    config: overriddenOptions,
    customRules: ["@github/markdownlint-github"],
    markdownItFactory,
    outputFormatters: [
      [ "markdownlint-cli2-formatter-pretty", { "appendLink": true } ]
    ]
}

export default options
