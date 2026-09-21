"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.resolve(__dirname, "..");
const jsRoot = path.join(root, "js");
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : entry.name.endsWith(".js") ? [fullPath] : [];
  });
}
const files = walk(jsRoot);
const failures = [];
for (const file of files) {
  try { new vm.Script(fs.readFileSync(file, "utf8"), { filename: path.relative(root, file) }); }
  catch (error) { failures.push({ file: path.relative(root, file), message: error.message }); }
}
if (failures.length) {
  console.error("Frontend JavaScript syntax check failed:");
  failures.forEach(item => console.error("- " + item.file + ": " + item.message));
  process.exitCode = 1;
} else {
  console.log("Frontend JavaScript syntax check passed for " + files.length + " files.");
}