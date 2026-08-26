import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let validWords = new Set();

export async function loadWords() {
    let text = await readFile(path.join(__dirname, "../data/words.txt"), "utf-8");

    validWords = new Set(text.split("\n"));
}

export function isValidWord(word) {
    return validWords.has(word.toUpperCase());
}