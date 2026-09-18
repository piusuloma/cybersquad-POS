import { useMemo, useState } from "react";
import type { InventoryItem } from "@/frontdesk/lib/store";

export interface PosCartLine {
  productId: string;
  name: string;
  sku?: string;
  unitPrice: number;
  quantity: number;
}

export function usePosCart() {
  const [lines, setLines] = useState<PosCartLine[]>([]);

  const addItem = (item: InventoryItem, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((line) => line.productId === item.id);
      if (existing) {
        return prev.map((line) =>
          line.productId === item.id ? { ...line, quantity: line.quantity + quantity } : line
        );
      }
      return [
        ...prev,
        {
          productId: item.id,
          name: item.name,
          sku: item.sku,
          unitPrice: item.price,
          quantity,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) {
        return prev.filter((line) => line.productId !== productId);
      }
      return prev.map((line) => (line.productId === productId ? { ...line, quantity } : line));
    });
  };

  const removeItem = (productId: string) => {
    setLines((prev) => prev.filter((line) => line.productId !== productId));
  };

  const clear = () => setLines([]);

  const restore = (savedLines: PosCartLine[]) => setLines(savedLines);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [lines]
  );

  return { lines, addItem, updateQuantity, removeItem, clear, restore, subtotal };
}
