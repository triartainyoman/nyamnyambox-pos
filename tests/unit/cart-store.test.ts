// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import type { Product } from "@/lib/types";
import { useCartStore } from "@/stores/useCartStore";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    name: "Thai Basil Chicken",
    price: 20_000,
    image_url: "/products/thai-basil-chicken.svg",
    is_active: true,
    created_at: "2026-10-25T00:00:00.000Z",
    ...overrides,
  };
}

const chicken = makeProduct();
const tea = makeProduct({
  id: "product-2",
  name: "Thai Tea",
  price: 12_000,
  image_url: null,
});

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], lastAddedId: null });
});

describe("useCartStore", () => {
  it("adds a new product with quantity 1 and no notes", () => {
    useCartStore.getState().addItem(chicken);

    expect(useCartStore.getState().items).toEqual([
      {
        productId: "product-1",
        name: "Thai Basil Chicken",
        price: 20_000,
        imageUrl: "/products/thai-basil-chicken.svg",
        quantity: 1,
        notes: "",
      },
    ]);
    expect(useCartStore.getState().lastAddedId).toBe("product-1");
  });

  it("increments an existing product instead of duplicating it", () => {
    const { addItem } = useCartStore.getState();
    addItem(chicken);
    addItem(chicken);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it("keeps existing notes when the same product is added again", () => {
    useCartStore.getState().addItem(chicken);
    useCartStore.getState().setNotes("product-1", "Tanpa sambal");
    useCartStore.getState().addItem(chicken);

    expect(useCartStore.getState().items[0]).toMatchObject({
      quantity: 2,
      notes: "Tanpa sambal",
    });
  });

  it("increments and decrements quantities", () => {
    useCartStore.getState().addItem(chicken);
    useCartStore.getState().increment("product-1");
    expect(useCartStore.getState().items[0].quantity).toBe(2);

    useCartStore.getState().decrement("product-1");
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it("removes an item when decremented to zero", () => {
    useCartStore.getState().addItem(chicken);
    useCartStore.getState().decrement("product-1");

    expect(useCartStore.getState().items).toEqual([]);
  });

  it("ignores increments/decrements for unknown products", () => {
    useCartStore.getState().addItem(chicken);
    useCartStore.getState().increment("missing");
    useCartStore.getState().decrement("missing");

    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it("removes items and updates notes", () => {
    useCartStore.getState().addItem(chicken);
    useCartStore.getState().addItem(tea);
    useCartStore.getState().setNotes("product-2", "Less sugar");

    expect(useCartStore.getState().items.find((item) => item.productId === "product-2")?.notes).toBe(
      "Less sugar",
    );

    useCartStore.getState().remove("product-1");
    expect(useCartStore.getState().items.map((item) => item.productId)).toEqual(["product-2"]);
  });

  it("clears the cart and the last-added marker", () => {
    useCartStore.getState().addItem(chicken);
    useCartStore.getState().clear();

    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().lastAddedId).toBeNull();
  });

  it("computes total items and total price", () => {
    const { addItem } = useCartStore.getState();
    addItem(chicken);
    addItem(chicken);
    addItem(tea);

    expect(useCartStore.getState().totalItems()).toBe(3);
    expect(useCartStore.getState().totalPrice()).toBe(52_000);
  });

  it("returns zero totals for an empty cart", () => {
    expect(useCartStore.getState().totalItems()).toBe(0);
    expect(useCartStore.getState().totalPrice()).toBe(0);
  });

  it("persists only the items under the versioned key", () => {
    useCartStore.getState().addItem(chicken);

    const stored = JSON.parse(localStorage.getItem("nyb-cart-v1") ?? "{}");
    expect(stored.version).toBe(1);
    expect(stored.state.items).toHaveLength(1);
    expect(stored.state.lastAddedId).toBeUndefined();
  });

  it("rehydrates persisted items", async () => {
    localStorage.setItem(
      "nyb-cart-v1",
      JSON.stringify({
        version: 1,
        state: {
          items: [
            {
              productId: "product-2",
              name: "Thai Tea",
              price: 12_000,
              imageUrl: null,
              quantity: 3,
              notes: "Less sugar",
            },
          ],
        },
      }),
    );

    await useCartStore.persist.rehydrate();

    expect(useCartStore.getState().items).toEqual([
      {
        productId: "product-2",
        name: "Thai Tea",
        price: 12_000,
        imageUrl: null,
        quantity: 3,
        notes: "Less sugar",
      },
    ]);
    expect(useCartStore.getState().totalPrice()).toBe(36_000);
  });
});
