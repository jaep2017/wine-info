export type SeedWine = {
  producer: string;
  producerCountry: string;
  name: string;
  vintage: number;
  country: string;
  region: string;
  subregion?: string;
  appellation: string;
  vineyard?: string;
  classification?: string;
  wineType: string;
  grapes: Array<{ name: string; percentage: number | null }>;
  consumedAt: string;
  personalNotes?: string;
};

export const SEED_WINES: SeedWine[] = [
  {
    producer: "Vincent Dauvissat",
    producerCountry: "France",
    name: "Chablis Premier Cru La Forest",
    vintage: 2020,
    country: "France",
    region: "Burgundy",
    subregion: "Chablis",
    appellation: "Chablis Premier Cru",
    vineyard: "La Forest",
    classification: "Premier Cru",
    wineType: "White",
    grapes: [{ name: "Chardonnay", percentage: 100 }],
    consumedAt: "2025-11-02T19:00:00.000Z",
    personalNotes: "Left-bank Premier Cru; first serious Dauvissat.",
  },
  {
    producer: "François Raveneau",
    producerCountry: "France",
    name: "Chablis Premier Cru Montée de Tonnerre",
    vintage: 2019,
    country: "France",
    region: "Burgundy",
    subregion: "Chablis",
    appellation: "Chablis Premier Cru",
    vineyard: "Montée de Tonnerre",
    classification: "Premier Cru",
    wineType: "White",
    grapes: [{ name: "Chardonnay", percentage: 100 }],
    consumedAt: "2026-01-18T19:00:00.000Z",
  },
  {
    producer: "William Fèvre",
    producerCountry: "France",
    name: "Chablis Grand Cru Les Clos",
    vintage: 2018,
    country: "France",
    region: "Burgundy",
    subregion: "Chablis",
    appellation: "Chablis Grand Cru",
    vineyard: "Les Clos",
    classification: "Grand Cru",
    wineType: "White",
    grapes: [{ name: "Chardonnay", percentage: 100 }],
    consumedAt: "2026-03-09T19:00:00.000Z",
  },
  {
    producer: "Domaine Huet",
    producerCountry: "France",
    name: "Vouvray Le Mont Sec",
    vintage: 2018,
    country: "France",
    region: "Loire",
    subregion: "Touraine",
    appellation: "Vouvray",
    vineyard: "Le Mont",
    classification: "Sec",
    wineType: "White",
    grapes: [{ name: "Chenin Blanc", percentage: 100 }],
    consumedAt: "2025-12-14T19:00:00.000Z",
  },
  {
    producer: "Jean-Paul & Jean-Luc Jamet",
    producerCountry: "France",
    name: "Côte-Rôtie",
    vintage: 2019,
    country: "France",
    region: "Northern Rhône",
    appellation: "Côte-Rôtie",
    wineType: "Red",
    grapes: [
      { name: "Syrah", percentage: 95 },
      { name: "Viognier", percentage: 5 },
    ],
    consumedAt: "2026-02-07T19:00:00.000Z",
  },
  {
    producer: "Produttori del Barbaresco",
    producerCountry: "Italy",
    name: "Barbaresco",
    vintage: 2019,
    country: "Italy",
    region: "Piedmont",
    appellation: "Barbaresco",
    classification: "DOCG",
    wineType: "Red",
    grapes: [{ name: "Nebbiolo", percentage: 100 }],
    consumedAt: "2025-10-21T19:00:00.000Z",
  },
  {
    producer: "Giuseppe Rinaldi",
    producerCountry: "Italy",
    name: "Barolo Brunate",
    vintage: 2016,
    country: "Italy",
    region: "Piedmont",
    subregion: "Barolo",
    appellation: "Barolo",
    vineyard: "Brunate",
    classification: "DOCG",
    wineType: "Red",
    grapes: [{ name: "Nebbiolo", percentage: 100 }],
    consumedAt: "2026-04-12T19:00:00.000Z",
  },
  {
    producer: "Domaine Roulot",
    producerCountry: "France",
    name: "Meursault Les Lucets",
    vintage: 2019,
    country: "France",
    region: "Burgundy",
    subregion: "Côte de Beaune",
    appellation: "Meursault",
    vineyard: "Les Lucets",
    wineType: "White",
    grapes: [{ name: "Chardonnay", percentage: 100 }],
    consumedAt: "2026-05-03T19:00:00.000Z",
  },
  {
    producer: "Joh. Jos. Prüm",
    producerCountry: "Germany",
    name: "Wehlener Sonnenuhr Riesling Spätlese",
    vintage: 2018,
    country: "Germany",
    region: "Mosel",
    appellation: "Mosel",
    vineyard: "Wehlener Sonnenuhr",
    classification: "Spätlese",
    wineType: "White",
    grapes: [{ name: "Riesling", percentage: 100 }],
    consumedAt: "2025-09-30T19:00:00.000Z",
  },
  {
    producer: "López de Heredia",
    producerCountry: "Spain",
    name: "Viña Tondonia Reserva",
    vintage: 2011,
    country: "Spain",
    region: "Rioja",
    appellation: "Rioja",
    vineyard: "Viña Tondonia",
    classification: "Reserva",
    wineType: "Red",
    grapes: [
      { name: "Tempranillo", percentage: 75 },
      { name: "Garnacha", percentage: 15 },
      { name: "Graciano", percentage: 5 },
      { name: "Mazuelo", percentage: 5 },
    ],
    consumedAt: "2026-06-20T19:00:00.000Z",
  },
];

export const SEED_NOTES: Array<{
  entityType: "region" | "grape" | "producer";
  title: string;
  summary: string;
  content: string;
  depth: number;
}> = [
  {
    entityType: "region",
    title: "Chablis",
    summary:
      "Your Chablis record now includes left-bank Premier Cru, a right-bank-adjacent Montée de Tonnerre, and one Grand Cru from Les Clos.",
    depth: 3,
    content: `# Chablis

## Regional Thesis

Chablis is not simply “steely Chardonnay.” It is a northern Burgundian appellation whose educational value lies in the interaction of a cool continental climate, a highly articulated vineyard hierarchy, and a producer culture that still argues about reduction, oak, and the meaning of Kimmeridgian soils. Established fact: the AOC structure distinguishes Petit Chablis, Chablis, Premier Cru, and Grand Cru. Accepted interpretation: the Grand Cru hill and certain Premier Crus repay site-level study. Debated: how directly the limestone/marl complex “causes” the wines’ mineral reputation.

## History

The modern reputation of Chablis was rebuilt after phylloxera, war, and the frost-prone decades of the mid-twentieth century. The expansion of the appellation, the classification of Premier Crus, and the later international demand for a clean, unoaked Chardonnay style are separate historical layers. Do not collapse them into a single origin myth.

## Geography

The Serein river divides a landscape of modest hills. Left-bank Premier Crus (including La Forest / La Forêt, Montmains, Vaillons) and right-bank / hill-adjacent sites (Montée de Tonnerre, Fourchaume, the Grand Cru slope) are not symmetrical. Montée de Tonnerre sits beside the Grand Cru hill and is often treated, in professional practice, as a Premier Cru with Grand Cru adjacency rather than a generic “right bank” wine.

## Geology

Kimmeridgian marls and Portlandian limestones are the conventional geological story. Established fact: these formations are present and mapped. Speculation to avoid: that fossils or “oyster shells” translate into flavor. A more disciplined claim is that soil depth, clay-to-limestone ratio, drainage, and aspect affect ripening and vine vigor, which then affect wine structure.

## Climate

Chablis is frost-sensitive and vintage-transparent. 2018, 2019, and 2020 are not interchangeable: they differ in heat accumulation, yield, and the degree to which Premier Cru sites retained tension. Vintage comments belong at the site-and-producer level, not as a single regional slogan.

## Appellation Structure

Petit Chablis, village Chablis, 40 Premier Crus (often grouped in practice), and seven Grand Crus. Premier Cru naming on labels can use a broader climat (Montmains) or a specific lieu-dit (La Forest). That administrative choice is itself part of what a bottle teaches.

## Important Vineyards

La Forest (left bank, often grouped under Montmains) is central to the Dauvissat argument. Montée de Tonnerre is the usual first comparison against the Grand Cru hill. Les Clos is the largest Grand Cru and a conventional reference for scale and longevity. Fourchaume remains a useful northern right-bank gap if it is missing from the cellar.

## Viticulture

Frost protection, yield discipline, and the decision to hand-harvest specific slopes matter more here than generic “sustainable” language. Producer differences in these choices often exceed differences in marketing soil poetry.

## Winemaking

The live arguments are: stainless versus barrel, the role of lees, malolactic completion, and how much reduction is tolerated. Dauvissat and Raveneau are not a single “traditional” school; they are two estates with overlapping but not identical élevage philosophies.

## Producer Landscape

A serious Chablis education usually needs at least one old-school reference (Dauvissat or Raveneau), one larger but site-serious domaine (Fèvre among others), and later a grower who pushes a more oxidative or more reductive extreme. Three bottles can open that map; they do not complete it.

## Vintage Variation

Use 2018 Les Clos, 2019 Montée de Tonnerre, and 2020 La Forest as a first vintage/site matrix rather than as a quality ranking. Heat and ripeness in 2018/2020 make the Grand Cru and left-bank contrast more about density and line than about a cartoon of “cool Chablis.”

## Aging

Premier Cru and Grand Cru Chablis can age on acidity, extract, and reduction rather than on oak sweetening. That is an accepted professional interpretation, not a guarantee for every bottling.

## Comparative Context

The useful external comparisons are Côte de Beaune Chardonnay (Roulot Meursault in this library) and cool-climate Chenin (Huet), not Chardonnay from anywhere. The point is to separate variety from place and élevage.

## Debates and Misconceptions

Chablis is not automatically unoaked, not automatically “mineral because of oysters,” and not a lesser Burgundy. Those are consumer simplifications. The productive debate is about site hierarchy, frost, and winemaking choices.

## Your Experience

You have drunk Dauvissat La Forest 2020, Raveneau Montée de Tonnerre 2019, and Fèvre Les Clos 2018. That is a strong introductory triangle: left-bank Premier Cru, Grand Cru-adjacent Premier Cru, and a Grand Cru reference. Producer variation is present; northern right-bank Fourchaume and village-level volume are still thin.

## What to Explore Next

A Fourchaume or a second left-bank site (Montmains or Vaillons) from a different grower would tighten the geography. A village Chablis from Dauvissat or Raveneau would show what the Premier Cru increment is actually buying.
`,
  },
  {
    entityType: "grape",
    title: "Chardonnay",
    summary:
      "Your Chardonnay experience is anchored in Chablis and one Meursault, which is enough to start separating climate, soil, and élevage.",
    depth: 2,
    content: `# Chardonnay

## Regional Thesis

Chardonnay is a relatively neutral, early-budding variety whose interest is almost never “the grape itself” and almost always the combination of climate, yield, and élevage. Your bottles already make that claim concrete: Chablis versus Meursault is a better lesson than another tasting-note list.

## Comparative Context

Hold the variety still. Change place. Dauvissat and Raveneau argue for northern, frost-prone, limestone-marl Chablis with restrained oak. Roulot’s Meursault Les Lucets argues for Côte de Beaune ripeness, a different village structure, and a domaine famous for precision rather than for a single climat myth.

## Your Experience

Three Chablis and one Meursault. Stronger on cool-climate, high-acid expressions than on Côte de Beaune premiers or California/Jura detours. You do not yet have a sparkling or a heavily barrel-marked New World reference, which is a gap only if you want to isolate élevage further.

## What to Explore Next

A Meursault Premier Cru or a Puligny village wine would deepen the Côte de Beaune side without abandoning the Chardonnay thread. Alternatively, a Champagne Blanc de Blancs would add a third climate and a different legal structure.
`,
  },
  {
    entityType: "producer",
    title: "Vincent Dauvissat",
    summary:
      "La Forest 2020 is your first Dauvissat: a left-bank Premier Cru through which the estate’s élevage and site hierarchy become visible.",
    depth: 2,
    content: `# Vincent Dauvissat

## Producer Landscape

Vincent Dauvissat (and the broader Dauvissat family practice) sits in the small group of Chablis estates around which professional tasting still orients. The wines are often discussed for their combination of site fidelity, long élevage, and a reductive/mineral register that should be treated as a house style, not as proof of geology-as-flavor.

## Winemaking

Accepted professional interpretation: Dauvissat uses barrel élevage more readily than the stainless-only school, without turning Chablis into Côte de Beaune pastiche. Debated: how much of the house signature is élevage versus old vines and low yields. Do not resolve that from a single bottle.

## Important Vineyards

La Forest is one of the estate’s central Premier Crus and a left-bank reference. Village Chablis and other Premiers (Vaillons, Séchet) would show how much of what you tasted is site versus house.

## Your Experience

One wine: 2020 La Forest. That is enough to open the producer note and not enough to speak about vintage consistency or the Grand Cru range.

## What to Explore Next

A Dauvissat village Chablis or Vaillons, or a Raveneau wine you can sit beside La Forest, which you now have in Montée de Tonnerre. The comparison is already available in the library.
`,
  },
];
