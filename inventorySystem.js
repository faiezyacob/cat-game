/**
 * inventorySystem.js - Handles item storage and discovery.
 */
class InventorySystem {
    constructor(savedInventory) {
        this.items = {
            feather: 0,
            yarn: 0,
            bell: 0,
            ...savedInventory
        };
    }

    addItem(itemId, count = 1) {
        if (this.items[itemId] !== undefined) {
            this.items[itemId] += count;
            return true;
        }
        return false;
    }

    hasItem(itemId, count = 1) {
        return (this.items[itemId] || 0) >= count;
    }

    useItem(itemId, count = 1) {
        if (this.hasItem(itemId, count)) {
            this.items[itemId] -= count;
            return true;
        }
        return false;
    }

    getInventory() {
        return this.items;
    }
}

window.InventorySystem = InventorySystem;
