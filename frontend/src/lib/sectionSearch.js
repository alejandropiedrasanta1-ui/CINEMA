import { createContext } from "react";

export const SectionSearchContext = createContext("");

export const normalizeText = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// Recursively extract all visible text from a React children tree
export function extractText(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return `${node} `;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && node.props) {
    let out = "";
    const p = node.props;
    ["label", "title", "desc", "placeholder", "hint"].forEach(k => {
      if (typeof p[k] === "string") out += `${p[k]} `;
    });
    if (Array.isArray(p.options)) {
      p.options.forEach(o => { if (o && typeof o.label === "string") out += `${o.label} `; });
    }
    out += extractText(p.children);
    return out;
  }
  return "";
}

export function matchesSearch(query, text) {
  const q = normalizeText(query).trim();
  if (!q) return true;
  const t = normalizeText(text);
  return q.split(/\s+/).every(token => t.includes(token));
}
