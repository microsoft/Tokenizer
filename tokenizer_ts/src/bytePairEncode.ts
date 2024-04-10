// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Convert a Uint8Array to a string
 * @param uint8Array
 * @returns string
 */
export function uint8ArrayToString(uint8Array: Uint8Array): string {
  return Array.from(uint8Array)
    .map(num => num.toString())
    .join("_");
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

  const byteIndicesAndRanks = new Array<{ index: number; rank: number }>(mergingBytes.length + 1);
  for (let i = 0; i < mergingBytes.length + 1; i++) {
    byteIndicesAndRanks[i] = { index: i, rank: Number.MAX_SAFE_INTEGER };
  }

  function getRank(startIndex: number, skip = 0): number {
    if (startIndex + skip + 2 < byteIndicesAndRanks.length) {
      const slice = mergingBytes.subarray(
        byteIndicesAndRanks[startIndex].index,
        byteIndicesAndRanks[startIndex + skip + 2].index
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
      byteIndicesAndRanks[i].rank = rank;
    }
  }

  while (byteIndicesAndRanks.length > 1) {
    let minRank: [number, number] = [0, Number.MAX_SAFE_INTEGER];
    for (let i = 0; i < byteIndicesAndRanks.length - 1; i++) {
      if (byteIndicesAndRanks[i].rank < minRank[1]) {
        minRank = [i, byteIndicesAndRanks[i].rank];
      }
    }
    if (minRank[1] !== Number.MAX_SAFE_INTEGER) {
      const j = minRank[0];
      byteIndicesAndRanks[j].rank = getRank(j, 1);
      if (j > 0) {
        byteIndicesAndRanks[j - 1].rank = getRank(j - 1, 1);
      }
      byteIndicesAndRanks.splice(j + 1, 1);
    } else {
      break;
    }
  }

  const outList = new Array<number>(byteIndicesAndRanks.length - 1);
  for (let i = 0; i < byteIndicesAndRanks.length - 1; i++) {
    outList[i] = ranks.get(
      uint8ArrayToString(
        mergingBytes.subarray(
          byteIndicesAndRanks[i].index,
          byteIndicesAndRanks[i + 1].index
        )
      )
    )!;
  }
  return outList;
}
