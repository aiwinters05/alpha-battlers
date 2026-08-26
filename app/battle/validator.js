let validWords = new Set();

export async function loadWords() {
    let response = await fetch("../data/words.txt");
    let text = await response.text();

    validWords = new Set(text.split("\n"));
}

export function isValidWord(word) {
    return validWords.has(word.toUpperCase());
}