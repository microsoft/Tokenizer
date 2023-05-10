// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Convert a Uint8Array to a string
 * @param uint8Array
 * @returns string
 */
export function uint8ArrayToString(uint8Array: Uint8Array): string {
  let str = "";
  for (let i = 0; i < uint8Array.length; i++) {
    str += uint8Array[i];
    if (i !== uint8Array.length) {
      str += "_";
    }
  }
  return str;
}

/**
 * This function implements the byte pair encoding algorithm.
 * @param mergingBytes: bytes to be merged
 * @param ranks: BPE rank for the bytes
 * @returns number[]: Encoded token ids
 */
export function bytePairEncode(
  mergingBytes: Uint8Array,
  ranks: ReadonlyMap<string, number>
): number[] {
  if (mergingBytes.length === 1) {
    return [ranks.get(mergingBytes[0].toString())!];
  }

  const byteIndicesAndRanks: [number, number][] = [];
  for (let i = 0; i < mergingBytes.length + 1; i++) {
    byteIndicesAndRanks.push([i, Number.MAX_SAFE_INTEGER]);
  }

  function getRank(startIndex: number, skip = 0): number {
    if (startIndex + skip + 2 < byteIndicesAndRanks.length) {
      const slice = mergingBytes.slice(
        byteIndicesAndRanks[startIndex][0],
        byteIndicesAndRanks[startIndex + skip + 2][0]
      );
      const rank = ranks.get(uint8ArrayToString(slice));
      if (rank !== undefined) {
        return rank;
      }
    }
    return Number.MAX_SAFE_INTEGER;
  }

  for (let i = 0; i < byteIndicesAndRanks.length - 2; i++) {
    const rank = getRank(i);
    if (rank !== Number.MAX_SAFE_INTEGER) {
      byteIndicesAndRanks[i][1] = rank;
    }
  }

  while (byteIndicesAndRanks.length > 1) {
    let minRank: [number, number] = [0, Number.MAX_SAFE_INTEGER];
    for (let i = 0; i < byteIndicesAndRanks.length - 1; i++) {
      if (byteIndicesAndRanks[i][1] < minRank[1]) {
        minRank = [i, byteIndicesAndRanks[i][1]];
      }
    }
    if (minRank[1] !== Number.MAX_SAFE_INTEGER) {
      const j = minRank[0];
      byteIndicesAndRanks[j][1] = getRank(j, 1);
      if (j > 0) {
        byteIndicesAndRanks[j - 1][1] = getRank(j - 1, 1);
      }
      byteIndicesAndRanks.splice(j + 1, 1);
    } else {
      break;
    }
  }

  const outList: number[] = [];
  for (let i = 0; i < byteIndicesAndRanks.length - 1; i++) {
    outList.push(
      ranks.get(
        uint8ArrayToString(
          mergingBytes.slice(
            byteIndicesAndRanks[i][0],
            byteIndicesAndRanks[i + 1][0]
          )
        )
      )!
    );
  }
  return outList;
}
