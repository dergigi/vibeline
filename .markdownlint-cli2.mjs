import markdownIt from "markdown-it"

const markdownItFactory = () => markdownIt({ html: true })

const options = {
    config: {
        "no-duplicate-heading": false, // Allow duplicate headings for changelogs
        "line-length": false, // Disable line length rule
        "fenced-code-language": false, // Allow code blocks without language
        "list-marker-space": false, // Allow different list marker spacing
        "ordered-list-marker-suffix": false, // Allow different ordered list suffixes
    },
    customRules: ["@github/markdownlint-github"],
    markdownItFactory,
    outputFormatters: [
      [ "markdownlint-cli2-formatter-pretty", { "appendLink": true } ]
    ]
}

export default options
