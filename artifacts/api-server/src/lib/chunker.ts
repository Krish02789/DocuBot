const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const MIN_CHUNK_LENGTH = 50;
const SEPARATORS = ["\n\n", "\n", ". ", " ", ""];

function splitBySeparator(text: string, separator: string): string[] {
  if (separator === "") {
    return text.split("").reduce<string[]>((acc, char, i) => {
      if (i % CHUNK_SIZE === 0) acc.push(char);
      else acc[acc.length - 1] += char;
      return acc;
    }, []);
  }
  return text.split(separator).filter((s) => s.length > 0);
}

export function chunkText(text: string): string[] {
  const chunks: string[] = [];

  function recursiveSplit(
    textPart: string,
    separatorIndex: number
  ): void {
    if (textPart.length <= CHUNK_SIZE) {
      if (textPart.trim().length >= MIN_CHUNK_LENGTH) {
        chunks.push(textPart.trim());
      }
      return;
    }

    const separator = SEPARATORS[separatorIndex];
    const parts = splitBySeparator(textPart, separator);

    let current = "";
    for (const part of parts) {
      const next = current ? current + separator + part : part;
      if (next.length <= CHUNK_SIZE) {
        current = next;
      } else {
        if (current.trim().length >= MIN_CHUNK_LENGTH) {
          chunks.push(current.trim());
        }
        if (part.length > CHUNK_SIZE && separatorIndex + 1 < SEPARATORS.length) {
          recursiveSplit(part, separatorIndex + 1);
          current = "";
        } else {
          current = part;
        }
      }
    }

    if (current.trim().length >= MIN_CHUNK_LENGTH) {
      chunks.push(current.trim());
    }
  }

  recursiveSplit(text, 0);

  const withOverlap: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    if (i === 0) {
      withOverlap.push(chunks[i]);
    } else {
      const prevTail = chunks[i - 1].slice(-CHUNK_OVERLAP);
      const combined = prevTail + " " + chunks[i];
      withOverlap.push(combined.trim());
    }
  }

  return withOverlap;
}
