import { transformFileAsync } from "@babel/core"
import tsPreset from "@babel/preset-typescript"
import babelPresetSolid from "babel-preset-solid"
import { build } from "esbuild"
import { execSync } from "node:child_process"
import { mkdirSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const distDir = join(process.cwd(), "dist")
const distComponentsDir = join(distDir, "components")
mkdirSync(distComponentsDir, { recursive: true })

console.log("Compiling TypeScript files with esbuild...")
await build({
  entryPoints: [
    "src/types.ts",
    "src/calculator.ts",
    "src/core.ts",
    "src/index.ts",
  ],
  outdir: "dist",
  format: "esm",
  platform: "node",
  target: "es2022",
  bundle: false,
  packages: "external",
})

console.log("Compiling TSX components with babel-preset-solid...")
const componentsDir = join(process.cwd(), "src", "components")
const componentFiles = readdirSync(componentsDir).filter((f) => f.endsWith(".tsx"))

for (const file of componentFiles) {
  const filePath = join(componentsDir, file)
  const result = await transformFileAsync(filePath, {
    presets: [
      [tsPreset, { isTSX: true, allExtensions: true }],
      [babelPresetSolid, { moduleName: "@opentui/solid", generate: "universal" }],
    ],
  })

  if (!result || !result.code) {
    throw new Error(`Failed to compile ${filePath} with Babel`)
  }

  const outFileName = file.replace(/\.tsx$/, ".js")
  writeFileSync(join(distComponentsDir, outFileName), result.code, "utf8")
}

console.log("Compiling src/tui.tsx with babel-preset-solid...")
const tuiResult = await transformFileAsync("src/tui.tsx", {
  presets: [
    [tsPreset, { isTSX: true, allExtensions: true }],
    [babelPresetSolid, { moduleName: "@opentui/solid", generate: "universal" }],
  ],
})

if (!tuiResult || !tuiResult.code) {
  throw new Error("Failed to compile src/tui.tsx with Babel")
}

writeFileSync(join(distDir, "tui.js"), tuiResult.code, "utf8")

console.log("Generating TypeScript declaration files...")
try {
  execSync("npx tsc --emitDeclarationOnly", { stdio: "inherit" })
} catch (err) {
  console.warn("Type declaration generation produced warnings, continuing...")
}

console.log("Build completed successfully!")
