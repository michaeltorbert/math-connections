const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
assert(script, "index.html script block not found");

function makeEl(tag = "div") {
  return {
    tagName: tag.toUpperCase(),
    children: [],
    style: {},
    dataset: {},
    className: "",
    textContent: "",
    innerHTML: "",
    value: "",
    checked: false,
    disabled: false,
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
    append(...kids) { this.children.push(...kids); },
    appendChild(kid) { this.children.push(kid); return kid; },
    remove() {},
    setAttribute(name, value) { this[name] = String(value); },
    getAttribute(name) { return this[name]; },
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    focus() {},
    click() {
      if (typeof this.onclick === "function") this.onclick({ preventDefault() {} });
    },
  };
}

const ids = new Map();
const context = {
  console,
  window: {},
  document: {
    body: makeEl("body"),
    createElement: makeEl,
    createElementNS: (ns, tag) => makeEl(tag),
    getElementById(id) {
      if (!ids.has(id)) ids.set(id, makeEl("div"));
      return ids.get(id);
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    execCommand() { return true; },
  },
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {},
  },
  navigator: { clipboard: { writeText: async () => {} } },
  location: { hash: "" },
  setTimeout(fn) {
    if (typeof fn === "function") fn();
    return 0;
  },
  clearTimeout() {},
  Blob: function Blob() {},
  URL: {
    createObjectURL() { return "blob:fake"; },
    revokeObjectURL() {},
  },
  SpeechSynthesisUtterance: function SpeechSynthesisUtterance(text) {
    this.text = text;
  },
};

context.window = context;
context.speechSynthesis = {
  getVoices() { return []; },
  cancel() {},
  speak() {},
};

vm.createContext(context);
vm.runInContext(script[1], context, { filename: "index.html" });

const result = context.runSelfTests();
assert.strictEqual(result.fail, 0);
assert(result.pass > 0);

console.log(`practice-core tests passed (${result.pass} assertions)`);
