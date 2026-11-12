// Entity pages: the alias table decides first (brand vs generic, hyphen vs space), containment catches the
// rest. Pure rule, no database: the same three spellings must fold into one page, and two different genes must
// not.
import assert from "node:assert/strict";
import { test } from "node:test";
import { clusterSpellings } from "@aihot/backend/publication/entities";

interface Group {
  name: string;
  aliases: string[];
}

const letters = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

function indexOf(groups: Group[]): Map<string, Group> {
  const index = new Map<string, Group>();
  for (const group of groups) {
    for (const spelling of [group.name, ...group.aliases]) index.set(letters(spelling), group);
  }
  return index;
}

test("a curated alias group folds a brand and its generic into one page, under the curated name", () => {
  const index = indexOf([{ name: "asundexian", aliases: ["Sunharbo", "asundexian (Sunharbo)", "Sunharbo (asundexian)"] }]);
  const clusters = clusterSpellings(
    [
      { name: "Sunharbo (asundexian)", readouts: 5 },
      { name: "Sunharbo", readouts: 4 },
      { name: "asundexian (Sunharbo)", readouts: 3 },
    ],
    index,
  );
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]!.slug, "asundexian");
  assert.equal(clusters[0]!.name, "asundexian");
  assert.equal(clusters[0]!.readouts, 12);
  assert.deepEqual([...clusters[0]!.names].sort(), ["Sunharbo", "Sunharbo (asundexian)", "asundexian (Sunharbo)"]);
});

test("the name inside the parentheses is a key too, so a trade name finds its group", () => {
  const index = indexOf([{ name: "abemaciclib", aliases: ["Verzenio"] }]);
  const clusters = clusterSpellings(
    [
      { name: "abemaciclib (Verzenio)", readouts: 1 },
      { name: "Verzenio", readouts: 1 },
    ],
    index,
  );
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]!.name, "abemaciclib");
  assert.equal(clusters[0]!.readouts, 2);
});

test("without a curated group, containment still folds the long and the short spelling", () => {
  const clusters = clusterSpellings(
    [
      { name: "factor XIa (FXIa)", readouts: 3 },
      { name: "Factor XIa", readouts: 3 },
      { name: "XIa", readouts: 3 },
    ],
    new Map(),
  );
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]!.name, "factor XIa (FXIa)");
  assert.equal(clusters[0]!.readouts, 9);
});

test("two different mutations of the same gene stay two pages", () => {
  const clusters = clusterSpellings(
    [
      { name: "KRAS G12C", readouts: 2 },
      { name: "KRAS G12D", readouts: 1 },
    ],
    new Map(),
  );
  assert.equal(clusters.length, 2);
  assert.deepEqual(clusters.map((c) => c.slug).sort(), ["kras-g12c", "kras-g12d"]);
});

test("a curated group overrides the spelling the page is named after", () => {
  const index = indexOf([{ name: "pembrolizumab", aliases: ["Keytruda"] }]);
  const clusters = clusterSpellings([{ name: "pembrolizumab (Keytruda, Merck)", readouts: 1 }], index);
  assert.equal(clusters[0]!.name, "pembrolizumab");
  assert.equal(clusters[0]!.slug, "pembrolizumab");
  // The full spelling stays in names: the readout query matches the card text, not the slug.
  assert.deepEqual(clusters[0]!.names, ["pembrolizumab (Keytruda, Merck)"]);
});
