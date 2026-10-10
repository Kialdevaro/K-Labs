#include <cstdint>
#include <cstring>

// Hardware Constraints & Boundaries
constexpr uint32_t RAM_SIZE  = 0x00200000; // 2MB Main RAM
constexpr uint32_t BIOS_SIZE = 0x00080000; // 512KB BIOS
constexpr uint32_t VRAM_SIZE = 0x00100000; // 1MB VRAM (1024x512x16)

alignas(64) uint8_t main_ram[RAM_SIZE];
alignas(64) uint8_t bios_rom[BIOS_SIZE];
alignas(64) uint8_t scratchpad[1024]; // 1KB Data Cache mapped at 0x1F800000

// Internal Hardware Registers Base
constexpr uint32_t HW_REG_BASE = 0x1F801000;