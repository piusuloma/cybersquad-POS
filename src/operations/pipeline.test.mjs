import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { build } from "esbuild";

const root = path.resolve("src");
const bundled = await build({
  entryPoints: ["src/operations/pipeline.ts"], bundle: true, write: false, format: "esm", platform: "node",
  plugins: [{
    name: "pipeline-test",
    setup(builder) {
      builder.onResolve({ filter: /^@\/frontdesk\/lib\/(db|store)$/ }, (args) => ({ path: args.path, namespace: "fixture" }));
      builder.onResolve({ filter: /^@\/pos\/lib\/(store|devices)$/ }, (args) => ({ path: path.join(root, args.path.slice(2)) + ".ts" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
        contents: args.path.endsWith("/db")
          ? 'const records = new Map(); export async function dbGet(key) { await Promise.resolve(); return structuredClone(records.get(key)); } export async function dbSet(key, value) { await Promise.resolve(); records.set(key, structuredClone(value)); }'
          : 'let id = 0; export const generateId = () => String(++id); export const PAYMENT_MODE_LABELS = { cash: "Cash" };',
        loader: "js",
      }));
    },
  }],
});
const flow = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const customer = { name: "Ada", phone: "08011112222" };
const lines = [{ name: "Laptop bag", quantity: 2, unitPrice: 10000 }];

test("quotes are traceable, discount-limited and convert to a reserved order", async () => {
  await assert.rejects(flow.createQuote({ customer, lines, discount: 5000, validDays: 7, owner: "Sam", role: "sales" }), /admin/);
  const quote = await flow.createQuote({ customer, lines, discount: 1000, validDays: 7, owner: "Sam", role: "sales" });
  assert.equal(quote.total, 19000);
  await assert.rejects(flow.decideQuote(quote.id, "accepted", "Sam", ""), /sent/);
  await flow.sendQuote(quote.id, "Sam");
  await flow.reviseQuote(quote.id, "Sam", "sales", lines, 0);
  let saved = (await flow.getPipeline()).quotes[0];
  assert.equal(saved.status, "draft");
  assert.match(saved.history.at(-1).change, /Revised/);
  await flow.sendQuote(quote.id, "Sam");
  await assert.rejects(flow.decideQuote(quote.id, "declined", "Sam", ""), /reason/);
  await flow.decideQuote(quote.id, "accepted", "Sam", "");
  const sale = await flow.convertQuoteToOrder(quote.id, "Sam", new Date(Date.now() + 86400000).toISOString());
  assert.equal(sale.lifecycle, "reserved");
  assert.equal(sale.total, 20000);
  await assert.rejects(flow.convertQuoteToOrder(quote.id, "Sam", new Date().toISOString()), /accepted/);
});

test("sourcing needs procurement to answer before a linked quote is created", async () => {
  const request = await flow.createSourcing({ customer, product: "Rare GPU", spec: "24GB", quantity: 1, requestedBy: "Sam" });
  await assert.rejects(flow.respondSourcing(request.id, "Sam", "sales", 500000, "2026-10-30", ""), /procurement/i);
  await flow.respondSourcing(request.id, "Ife", "inventory_manager", 500000, "2026-10-30", "Supplier A");
  const quote = await flow.createQuote({ customer, lines: [{ name: "Rare GPU", quantity: 1, unitPrice: 500000 }], discount: 0, validDays: 7, owner: "Sam", role: "sales", sourcingId: request.id });
  const state = await flow.getPipeline();
  assert.equal(state.sourcing.find((entry) => entry.id === request.id).status, "quote_created");
  assert.equal(state.sourcing.find((entry) => entry.id === request.id).quoteId, quote.id);
});

test("transfers move sample stock only through dispatch and receipt by the right roles", async () => {
  const transfer = await flow.createTransfer({ sku: "SAMPLE-IP13", quantity: 2, fromBranch: "Lekki", toBranch: "Ikeja", requestedBy: "Sam" });
  await assert.rejects(flow.createTransfer({ sku: "SAMPLE-IP13", quantity: 9, fromBranch: "Lekki", toBranch: "Ikeja", requestedBy: "Sam" }), /enough stock/);
  await assert.rejects(flow.advanceTransfer(transfer.id, "dispatch", "Sam", "sales"), /inventory/);
  await flow.advanceTransfer(transfer.id, "dispatch", "Ife", "inventory_manager");
  await flow.advanceTransfer(transfer.id, "receive", "Sam", "sales");
  const stock = flow.branchStock((await flow.getPipeline()).transfers).find((item) => item.sku === "SAMPLE-IP13").stock;
  assert.deepEqual([stock.Lekki, stock.Ikeja], [2, 2]);
});
