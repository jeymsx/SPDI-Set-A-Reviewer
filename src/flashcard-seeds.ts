import { db } from './db';

interface SeedCard { front: string; back: string; }
interface SeedSet  { name: string; description: string; cards: SeedCard[]; }

const BUILT_IN_SETS: SeedSet[] = [
  // ─────────────────────────────────────────────────────────────────────
  // SET 1 — DFU & WSFU
  // ─────────────────────────────────────────────────────────────────────
  {
    name: 'DFU & WSFU',
    description: 'Drainage Fixture Units & Water Supply Fixture Units with pipe/trap sizes. WSFU format: (Cold-Hot)',
    cards: [
      // ── Drainage Fixture Units & Sizes ──
      { front: 'Drinking Fountain [DFU & Trap Size]',                                                                  back: '1 DFU - 31mm' },
      { front: 'Dental Cuspidor [DFU & Trap Size]',                                                                    back: '1 DFU - 32mm' },
      { front: 'Lavatory-wash Basin Single [DFU & Trap Size]',                                                         back: '1 DFU - 32mm' },
      { front: 'Bar Sink Private [DFU & Trap Size]',                                                                   back: '1 DFU - 38mm' },
      { front: 'Receptorts (floor sink) refrigerators, coffee urns, water stations [DFU & Trap Size]',                 back: '1 DFU - 38mm' },
      { front: 'Shower Gang [DFU & Trap Size]',                                                                        back: '2 DFU - 51mm' },
      { front: 'Shower Single Stall [DFU & Trap Size]',                                                                back: '2 DFU - 51mm' },
      { front: 'Urinal Washdown/Siphon Jet [DFU & Trap Size]',                                                        back: '2 DFU - 51mm' },
      { front: 'Urinal Small [DFU & Trap Size]',                                                                       back: '2 DFU - 51mm' },
      { front: 'Floor Drain [DFU & Trap Size]',                                                                        back: '2 DFU - 51mm' },
      { front: 'Glotheswashers [DFU & Trap Size]',                                                                     back: '2 DFU - 51mm' },
      { front: 'Bathtub [DFU & Trap Size]',                                                                            back: '2 DFU - 38mm' },
      { front: 'Bidet [DFU & Trap Size]',                                                                              back: '2 DFU - 38mm' },
      { front: 'Urinal Washout [DFU & Trap Size]',                                                                     back: '2 DFU - 38mm' },
      { front: 'Wash Basins in Sets [DFU & Trap Size]',                                                                back: '2 DFU - 38mm' },
      { front: 'Laundry Tub [DFU & Trap Size]',                                                                        back: '2 DFU - 38mm' },
      { front: 'Sink dishwasher residential [DFU & Trap Size]',                                                        back: '2 DFU - 38mm' },
      { front: 'Sink Bar commercial [DFU & Trap Size]',                                                                 back: '2 DFU - 38mm' },
      { front: 'Commercial and industrial sinks [DFU & Trap Size]',                                                    back: '3 DFU - 38mm' },
      { front: 'Interceptors for grease, oil [DFU & Trap Size]',                                                       back: '3 DFU - 51mm' },
      { front: 'Receptors for commercial sinks, dishwashers, air washers [DFU & Trap Size]',                          back: '3 DFU - 51mm' },
      { front: 'Urinal Wall-Mounted Only [DFU & Trap Size]',                                                           back: '3 DFU - 51mm' },
      { front: 'Service Sink [DFU & Trap Size]',                                                                       back: '3 DFU - 51mm' },
      { front: 'Water Closet Private [DFU & Trap Size]',                                                               back: '4 DFU - 76mm' },
      { front: 'Water Closet Public [DFU & Trap Size]',                                                                back: '6 DFU - 76mm' },
      { front: 'Interceptors for Sand, Autowash [DFU & Trap Size]',                                                    back: '6 DFU - 76mm' },
      { front: 'Mobile Home Park Traps [DFU & Trap Size]',                                                             back: '6 DFU - 76mm' },
      { front: 'Flushing Rim Sink Clinic [DFU & Trap Size]',                                                           back: '6 DFU - 76mm' },
      { front: 'Urinal Pedestal [DFU & Trap Size]',                                                                    back: '6 DFU - 76mm' },
      { front: 'Urinal Blowout [DFU & Trap Size]',                                                                     back: '6 DFU - 76mm' },

      // ── WSFU & Sizes ──
      { front: 'Lawn Sprinkler [WSFU (Cold-Hot)]',                                                                     back: '(1-1)' },
      { front: 'Lavatory (dental) [WSFU (Cold-Hot)]',                                                                  back: '(1-1)' },
      { front: 'Dental Cuspidor [WSFU (Cold-Hot)]',                                                                    back: '(0-1)' },
      { front: 'Sink wash circular or multiple (each set of faucets)** [WSFU (Cold-Hot)]',                             back: '(0-2)' },
      { front: 'Sink wash-up each set of faucets* [WSFU (Cold-Hot)]',                                                  back: '(0-2)' },
      { front: 'Sink wash-up circular spray [WSFU (Cold-Hot)]',                                                        back: '(0-4)' },
      { front: 'Flush tank urinal [WSFU (Cold-Hot)]',                                                                  back: '(0-3)' },
      { front: 'Wall Urinal [WSFU (Cold-Hot)]',                                                                        back: '(0-5)' },
      { front: 'Stall Urinal [WSFU (Cold-Hot)]',                                                                       back: '(0-5)' },
      { front: 'Pedesal Urinal [WSFU (Cold-Hot)]',                                                                     back: '(0-10)' },
      { front: 'Bathtub [WSFU (Cold-Hot)]',                                                                            back: '(2-4)' },
      { front: 'Bidet [WSFU (Cold-Hot)]',                                                                              back: '(2-4)' },
      { front: 'Kitchen Sink [WSFU (Cold-Hot)]',                                                                       back: '(2-4)' },
      { front: 'Laundry Tub [WSFU (Cold-Hot)]',                                                                        back: '(2-4)' },
      { front: 'Shower [WSFU (Cold-Hot)]',                                                                             back: '(2-4)' },
      { front: 'Service Sink [WSFU (Cold-Hot)]',                                                                       back: '(2-4)' },
      { front: 'Bar Sink [WSFU (Cold-Hot)]',                                                                           back: '(1-2)' },
      { front: 'Lavatory [WSFU (Cold-Hot)]',                                                                           back: '(1-2)' },
      { front: 'Drinking Fountain [WSFU (Cold-Hot)]',                                                                  back: '(1-2)' },
      { front: 'Dental Lavatory [WSFU (Cold-Hot)]',                                                                    back: '(1-2)' },
      { front: 'Bedpan Washer [WSFU (Cold-Hot)]',                                                                      back: '(0-10)' },
      { front: 'Clinic Flushing Film Sink [WSFU (Cold-Hot)]',                                                          back: '(0-10)' },
      { front: 'Combination Sink [WSFU (Cold-Hot)]',                                                                   back: '(3-0)' },
      { front: 'Economical Flush WC [WSFU (Cold-Hot)]',                                                                back: '(2.5-4)' },
      { front: 'Hose Bibb Or Sill Cock [WSFU (Cold-Hot)]',                                                            back: '(3-5)' },
      { front: 'Flush Tank WC [WSFU (Cold-Hot)]',                                                                      back: '(3-5)' },
      { front: 'Flushometer Tank WC [WSFU (Cold-Hot)]',                                                                back: '(3-5)' },
      { front: 'Flushometer Valve WC [WSFU (Cold-Hot)]',                                                               back: '(6-10)' },
      { front: 'Mobile Home Park Sewer [WSFU (Cold-Hot)]',                                                             back: '(6-6)' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // SET 2 — Technical Specifications
  // ─────────────────────────────────────────────────────────────────────
  {
    name: 'Technical Specifications',
    description: 'Refrigeration wastes, indirect waste piping, manholes, sewers, venting systems, traps & interceptors',
    cards: [
      // ── Refrigeration Wastes ──
      { front: 'Minimum inlet for waste line carrying refrigeration waste [Refrigeration Wastes]',                                                              back: '32mm' },
      { front: '32mm inlet → maximum refrigeration waste capacity [Refrigeration Wastes]',                                                                      back: 'Not more than 2.8 cu.m.' },
      { front: 'Pipe size for 1 to 12 cu.m. refrigeration waste (32mm inlet) [Refrigeration Wastes]',                                                          back: '51mm' },
      { front: 'Pipe size for 13 to 36 cu.m. refrigeration waste (32mm inlet) [Refrigeration Wastes]',                                                         back: '76mm' },

      // ── Indirect Waste Receptors — Clotheswasher ──
      { front: 'Height of standpipe receptor & traps [Indirect Waste Receptors — Clotheswasher]',                                                              back: '0.45m to 0.8m' },
      { front: 'Height of trap [Indirect Waste Receptors — Clotheswasher]',                                                                                    back: '0.15m to 0.45m' },
      { front: 'Strainer needed for indirect waste, receptor, or discharge particles that clogs the drain [Indirect Waste Receptors]',                          back: 'Beehive Strainer' },

      // ── Indirect Waste Piping ──
      { front: 'Length range where indirect waste pipes shall be directly trapped but not needed to be vented [Indirect Waste Piping]',                         back: '1.5m to 4.6m' },
      { front: 'Indirect waste pipes less than [___] need not be larger in diameter than the drain outlet or tailpiece [Indirect Waste Piping]',                back: '4.6m' },
      { front: 'Minimum dimension of indirect waste pipe [Indirect Waste Piping]',                                                                             back: '13mm' },

      // ── Manhole ──
      { front: 'Maximum distance between manholes [Manhole]',                                                                                                  back: '91m' },
      { front: 'Minimum distance of flexible compression joints outside of the manhole [Manhole]',                                                             back: '0.3m' },

      // ── Installation of Sewers ──
      { front: 'Vertical clearance between bottom of water pipe to top of sewer/drain line [Installation of Sewers]',                                         back: '0.3m' },
      { front: 'Horizontal clearance of water pipe → sewer or drain line [Installation of Sewers]',                                                           back: '0.3m' },
      { front: 'Vertical clearance of water pipes crossing sewage/drainage pipe [Installation of Sewers]',                                                    back: '0.3m' },
      { front: 'Distance of water pipe joints away from sewer line [Installation of Sewers]',                                                                 back: '3m' },

      // ── Minimum Horizontal Distance from Building Sewer ──
      { front: 'Min. horizontal distance: Building Sewer → building/structure [Min. Horizontal Distance from Building Sewer]',                                back: '0.6m' },
      { front: 'Min. horizontal distance: Building Sewer → property line adjoining private property [Min. Horizontal Distance from Building Sewer]',           back: 'Clear' },
      { front: 'Min. horizontal distance: Building Sewer → water supply wells [Min. Horizontal Distance from Building Sewer]',                                back: '15.2m' },
      { front: 'Min. horizontal distance: Building Sewer → Streams [Min. Horizontal Distance from Building Sewer]',                                           back: '15.2m' },
      { front: 'Min. horizontal distance: Building Sewer → on-site domestic water service line [Min. Horizontal Distance from Building Sewer]',               back: '0.3m' },
      { front: 'Min. horizontal distance: Building Sewer → public water main [Min. Horizontal Distance from Building Sewer]',                                 back: '0.3m' },
      { front: 'Reduction distance when drainage piping is construction of materials approved for use within building [Min. Horizontal Distance from Building Sewer]', back: '7.6m\n(Table 13-1) = 0.3m\n(Appendix B) = 3m' },

      // ── Grade, Support, and Protection of Building Sewer ──
      { front: 'Recommended slope for building sewer [Grade & Protection of Building Sewer]',                                                                  back: '2% or 21mm/m' },
      { front: 'Allowed slope for 102mm & 152mm diameter pipe [Grade & Protection of Building Sewer]',                                                        back: '1% or 10.5mm/m' },
      { front: 'Allowed slope for 203mm & up diameter pipe [Grade & Protection of Building Sewer]',                                                           back: '0.5% or 5.3mm/m' },
      { front: 'Distance: building sewer → outside face of building foundation/wall [Grade & Protection of Building Sewer]',                                   back: '0.6m' },
      { front: 'Lalim of building sewer → finish surface of ground [Grade & Protection of Building Sewer]',                                                   back: '0.3m' },

      // ── Steam & Hot Water Drainage Condensers and Sumps ──
      { front: 'Maximum temp to discharge under pressure directly into the drainage system [Steam & Hot Water Drainage Condensers and Sumps]',                 back: '60degC' },
      { front: 'Extension of deep seal trap from the bottom of the tank [Steam & Hot Water Drainage Condensers and Sumps]',                                   back: '12mm' },
      { front: 'Opening of highest point of the deep seal trap [Steam & Hot Water Drainage Condensers and Sumps]',                                            back: '19mm' },
      { front: 'Outlet taken from the side; water line permanently occupies not less than [__] of the condenser or sump capacity [Steam & Hot Water Drainage Condensers and Sumps]', back: '½' },

      // ── Concrete Sumps, Condensers or Intercepting Tanks ──
      { front: 'Wall thickness — concrete sumps, condensers or intercepting tanks [Concrete Sumps, Condensers or Intercepting Tanks]',                        back: '102mm' },
      { front: 'Thickness of cement plaster inside the tank [Concrete Sumps, Condensers or Intercepting Tanks]',                                             back: '13mm' },
      { front: 'Metal condenser specification [Concrete Sumps, Condensers or Intercepting Tanks]',                                                            back: 'Gauge 12 or 2.7mm thick' },

      // ── Connections in Blowoff Condensers & Sumps ──
      { front: 'Boiler Blowoff: 19mm / Water Outlet: 19mm [Connections in Blowoff Condensers & Sumps]',                                                      back: 'Size of vent: 51mm' },
      { front: 'Boiler Blowoff: 25.4mm / Water Outlet: 25.4mm [Connections in Blowoff Condensers & Sumps]',                                                  back: 'Size of vent: 64mm' },
      { front: 'Boiler Blowoff: 32mm / Water Outlet: 32mm [Connections in Blowoff Condensers & Sumps]',                                                      back: 'Size of vent: 76mm' },
      { front: 'Boiler Blowoff: 38mm / Water Outlet: 38mm [Connections in Blowoff Condensers & Sumps]',                                                      back: 'Size of vent: 102mm' },
      { front: 'Boiler Blowoff: 51mm / Water Outlet: 51mm [Connections in Blowoff Condensers & Sumps]',                                                      back: 'Size of vent: 127mm' },
      { front: 'Boiler Blowoff: 64mm / Water Outlet: 64mm [Connections in Blowoff Condensers & Sumps]',                                                      back: 'Size of vent: 152mm' },

      // ── Vertical Wet Venting ──
      { front: 'Limit of wet venting in Fixture Units [Vertical Wet Venting]',                                                                                back: '1-2 FU' },
      { front: 'Limit of fixtures in wet venting [Vertical Wet Venting]',                                                                                     back: '4 fixtures' },
      { front: 'Inlet levels considered a wet-vented section [Vertical Wet Venting]',                                                                         back: '2 consecutive inlet levels' },
      { front: 'Minimum wet vented section size relative to required waste pipe size [Vertical Wet Venting]',                                                  back: '1 pipe size larger or 51mm' },

      // ── Special Venting for Island Fixtures ──
      { front: 'Distance: island vent to other vents [Special Venting for Island Fixtures]',                                                                  back: '152mm' },
      { front: 'Slope of vented section back toward the drain [Special Venting for Island Fixtures]',                                                         back: '2%' },
      { front: 'Return bend used under the drainboard [Special Venting for Island Fixtures]',                                                                  back: '45 degree elbows / 1 piece fitting' },

      // ── Combination Waste & Vent System (CW&VS) ──
      { front: 'Branch length requiring separated vent [Combination Waste & Vent System (CW&VS)]',                                                            back: 'More than 4.6m' },
      { front: 'Minimum area of vent in CW&VS [Combination Waste & Vent System (CW&VS)]',                                                                    back: '½ of drain' },
      { front: 'Minimum waste pipe & trap size relative to fixture tailpiece [Combination Waste & Vent System (CW&VS)]',                                      back: '2 pipe sizes larger than fixture tailpiece or connected served' },
      { front: 'Wet-vented serving a trap within [___] ∅ or larger; cleanouts may not be required [Combination Waste & Vent System (CW&VS)]',                back: '51mm' },

      // ── Traps & Interceptors ──
      { front: 'Grease Trap: number of fixtures it retains grease from [Traps & Interceptors]',                                                               back: '1 to 4 fixtures' },
      { front: 'Grease Interceptor: minimum volume and fixtures served [Traps & Interceptors]',                                                               back: 'At least 3 cu.m., serving one or more fixtures' },
      { front: 'Number of traps permitted on a trap arm [Traps & Interceptors]',                                                                              back: '1 Trap' },
      { front: 'A single trap may serve a set of 3 of these [Traps & Interceptors]',                                                                          back: 'Compartment sinks / Laundry tubs (same depth) / 3 lavatories adjacent to each other' },
      { front: 'Maximum length of tailpiece [Traps & Interceptors]',                                                                                          back: '0.6m' },
    ],
  },
];

export async function seedBuiltInFlashcards(): Promise<void> {
  const SEED_KEY = 'fc_seeded_v1';
  if (localStorage.getItem(SEED_KEY)) return;

  try {
    let ts = Date.now();
    for (const set of BUILT_IN_SETS) {
      const setId = await db.flashcardSets.add({
        name: set.name,
        description: set.description,
        createdAt: ts,
        updatedAt: ts,
      });
      await db.flashcards.bulkAdd(
        set.cards.map((c, i) => ({
          setId: setId as number,
          front: c.front,
          back: c.back,
          order: i,
        })),
      );
      ts++;
    }
    localStorage.setItem(SEED_KEY, '1');
  } catch (err) {
    console.error('Flashcard seeding failed:', err);
  }
}
