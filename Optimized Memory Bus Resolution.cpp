// Force inline for WASM optimization
inline __attribute__((always_inline)) uint32_t resolve_physical_address(uint32_t vaddr) {
    // Mask KSEG0 (0x80000000) and KSEG1 (0xA0000000) to physical 0x00000000
    return vaddr & 0x1FFFFFFF;
}

uint32_t bus_read32(uint32_t vaddr) {
    uint32_t paddr = resolve_physical_address(vaddr);

    // Main RAM: 0x00000000 - 0x001FFFFF
    if (paddr < 0x00800000) {
        // Mirrored every 2MB up to 8MB
        uint32_t offset = paddr & (RAM_SIZE - 1);
        return *reinterpret_cast<uint32_t*>(&main_ram[offset]);
    }
    
    // BIOS ROM: 0x1FC00000 - 0x1FC7FFFF
    if (paddr >= 0x1FC00000 && paddr < 0x1FC80000) {
        uint32_t offset = paddr & (BIOS_SIZE - 1);
        return *reinterpret_cast<uint32_t*>(&bios_rom[offset]);
    }
    
    // Hardware Registers (I/O)
    if (paddr >= HW_REG_BASE && paddr < 0x1F803000) {
        return read_hw_register32(paddr);
    }
    
    // Scratchpad (Data RAM)
    if (paddr >= 0x1F800000 && paddr < 0x1F800400) {
        return *reinterpret_cast<uint32_t*>(&scratchpad[paddr & 0x3FF]);
    }
    
    return 0xFFFFFFFF; // Open bus behavior
}