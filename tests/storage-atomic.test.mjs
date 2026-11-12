import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = fs.readFileSync(new URL("../js/core/storage.js", import.meta.url), "utf8");

function loadStorage({ initial = {}, failKey = null } = {}) {
  const values = new Map(Object.entries(initial));
  let shouldFail = Boolean(failKey);
  const localStorage = {
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      if (shouldFail && key === failKey) {
        shouldFail = false;
        throw new Error("quota");
      }
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
  const alerts = [];
  class FileReader {
    readAsText(file) {
      this.result = file.text;
      this.onload({ target: this });
    }
  }
  const context = {
    window: null,
    localStorage,
    FileReader,
    Blob: class Blob {},
    URL: { createObjectURL: () => "blob:", revokeObjectURL() {} },
    document: {
      getElementById: () => null,
      createElement: () => ({ click() {}, remove() {} }),
      body: { appendChild() {}, removeChild() {} },
    },
    alert: (message) => alerts.push(message),
    console,
    setTimeout,
  };
  context.window = context;
  vm.runInNewContext(source, context);
  return { context, localStorage, alerts };
}

test("rejects malformed versioned backups without changing storage", () => {
  const { context, localStorage, alerts } = loadStorage({ initial: { a: "old" } });
  context.importUserData({
    target: {
      value: "",
      files: [{ text: JSON.stringify({ type: "tazkeer-progress-backup", version: 99, keys: { a: "new" } }) }],
    },
  });
  assert.equal(localStorage.getItem("a"), "old");
  assert.match(alerts[0], /فشل استيراد/);
});

test("rolls back all writes when a backup restore fails partway", () => {
  const { context, localStorage, alerts } = loadStorage({
    initial: { a: "old-a", b: "old-b" },
    failKey: "b",
  });
  context.importUserData({
    target: {
      value: "",
      files: [{
        text: JSON.stringify({
          type: "tazkeer-progress-backup",
          version: 1,
          keys: { a: "new-a", b: "new-b" },
        }),
      }],
    },
  });
  assert.equal(localStorage.getItem("a"), "old-a");
  assert.equal(localStorage.getItem("b"), "old-b");
  assert.match(alerts[0], /فشل استيراد/);
});

test("uses native file and share plugins for Android exports", async () => {
  const { context } = loadStorage({ initial: { progress: "done" } });
  const calls = [];
  context.Capacitor = {
    isNativePlatform: () => true,
    Plugins: {
      Filesystem: {
        writeFile: async (options) => {
          calls.push(["writeFile", options]);
          return { uri: "content://backup.json" };
        },
      },
      Share: {
        share: async (options) => calls.push(["share", options]),
      },
    },
  };

  await context.exportUserData();

  assert.equal(calls[0][0], "writeFile");
  assert.equal(calls[0][1].directory, "DOCUMENTS");
  assert.match(calls[0][1].data, /"type": "tazkeer-progress-backup"/);
  assert.equal(calls[1][0], "share");
  assert.equal(calls[1][1].url, "content://backup.json");
});
