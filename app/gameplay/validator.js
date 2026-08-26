let validWords = new Set();
 
export async function loadWords() {
  let text;
 
  if (typeof window === "undefined") {
    // node for server side stuff
    const { readFile } = await import("fs/promises");
    const { fileURLToPath } = await import("url");
    const path = await import("path");
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    text = await readFile(path.join(__dirname, "../data/words.txt"), "utf-8");
  } else {
    // browser stuff for ui.js etc..
    const response = await fetch("../data/words.txt");
    text = await response.text();
  }
 
  validWords = new Set(
    text.split("\n").map((w) => w.trim().toUpperCase()).filter(Boolean)
  );
}
 
export function isValidWord(word) {
  return validWords.has(word.toUpperCase());
}
