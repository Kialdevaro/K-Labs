struct CPUState {
    uint32_t pc;
    uint32_t next_pc;
    uint32_t current_pc;
    uint32_t registers[32];
    
    // Load Delay Slot simulation
    uint32_t load_delay_reg;
    uint32_t load_delay_val;
    
    // HI/LO registers for multiplication/division
    uint32_t hi;
    uint32_t lo;
    
    // Coprocessor 0 (System Control)
    uint32_t sr;    // Status Register (0x12)
    uint32_t cause; // Cause Register (0x13)
    uint32_t epc;   // Exception PC (0x14)
    
    uint64_t master_cycles;
};

CPUState cpu;

void cpu_step() {
    cpu.current_pc = cpu.pc;
    
    // Instruction Fetch (aligned 32-bit)
    uint32_t instruction = bus_read32(cpu.pc);
    
    // Advance PC allowing for branch delay slots
    cpu.pc = cpu.next_pc;
    cpu.next_pc += 4;
    
    // Execute pending load delay slot
    cpu.registers[cpu.load_delay_reg] = cpu.load_delay_val;
    cpu.load_delay_reg = 0; // Reset target (R0 is hardwired to 0)
    cpu.load_delay_val = 0;
    
    // Decode (Primary Opcode in top 6 bits)
    uint8_t opcode = instruction >> 26;
    
    switch (opcode) {
        case 0x00: execute_special(instruction); break; // ALU operations
        case 0x02: // J (Jump)
            cpu.next_pc = (cpu.current_pc & 0xF0000000) | ((instruction & 0x03FFFFFF) << 2);
            break;
        case 0x03: // JAL (Jump and Link)
            cpu.registers[31] = cpu.next_pc; // R31 is Return Address
            cpu.next_pc = (cpu.current_pc & 0xF0000000) | ((instruction & 0x03FFFFFF) << 2);
            break;
        case 0x0F: // LUI (Load Upper Immediate)
            cpu.load_delay_reg = (instruction >> 16) & 0x1F;
            cpu.load_delay_val = (instruction & 0xFFFF) << 16;
            break;
        // ... Complete instruction matrix omitted for brevity, adheres to exact R3000A ISA
        default:
            trigger_exception(0x20); // Reserved Instruction Exception
            break;
    }
    cpu.master_cycles += 2; // Approximate CPI, adjusted during DMA/Cache misses
}