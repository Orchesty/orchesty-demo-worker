/**
 * Static template pools used by the page-on-demand product generator.
 *
 * The generator picks an entry from each pool deterministically based on the
 * product index so the same `i` always yields the same product. Names and
 * descriptions are intentionally short, real-sounding e-shop copy — close
 * enough to a real Magento "Luma" demo catalog without shipping the full
 * 100 MB JSON dump.
 */

export const PRODUCT_NAME_BASES = [
    'Reflex Tank',
    'Joust Duffle Bag',
    'Strive Shoulder Pack',
    'Crown Summit Backpack',
    'Wayfarer Messenger Bag',
    'Rival Field Messenger',
    'Fusion Backpack',
    'Impulse Duffle',
    'Voyage Yoga Bag',
    'Endeavor Daytrip Backpack',
    'Driven Backpack',
    'Affirm Water Bottle',
    'Sprite Stasis Ball',
    'Sprite Yoga Strap',
    'Sprite Foam Yoga Brick',
    'Quest Lumaflex Band',
    'Pursuit Lumaflex Tone Band',
    'Go-Get\'r Pushup Grips',
    'Harmony Lumaflex Strength Band Kit',
    'Aim Analog Watch',
    'Dual Handle Cardio Bar',
    'Endurance Watch',
    'Bolo Sport Watch',
    'Cruise Dual Analog Watch',
    'Clamber Watch',
    'Summit Watch',
    'Track Watch',
    'Atomic Endurance Running Tee',
    'Frankie Sweatshirt',
    'Hero Hoodie',
    'Mach Street Sweatshirt',
    'Marco Lightweight Active Hoodie',
    'Beaumont Summit Kit',
    'Stark Fundamental Hoodie',
    'Linus Tee',
    'Logan HeatTec Tee',
    'Argus All-Weather Tank',
    'Ajax Full-Zip Sweatshirt',
    'Chaz Kangeroo Hoodie',
    'Erika Running Short',
    'Maxima Drawstring Short',
    'Sahara Leggings',
    'Helena Hooded Fleece',
    'Hera Pullover Hoodie',
    'Iris Workout Top',
    'Jade Yoga Jumper',
    'Karmen Yoga Pant',
    'Layla Tee',
    'Diana Tights',
    'Cassia Funnel Sweatshirt',
];

export const COLORS = [
    { name: 'Black', code: '49' },
    { name: 'Blue', code: '50' },
    { name: 'Brown', code: '51' },
    { name: 'Green', code: '53' },
    { name: 'Gray', code: '52' },
    { name: 'Orange', code: '57' },
    { name: 'Purple', code: '54' },
    { name: 'Red', code: '58' },
    { name: 'White', code: '59' },
    { name: 'Yellow', code: '60' },
];

export const SIZES = [
    { name: 'XS', code: '166' },
    { name: 'S', code: '167' },
    { name: 'M', code: '168' },
    { name: 'L', code: '169' },
    { name: 'XL', code: '170' },
    { name: 'XXL', code: '171' },
];

export const CATEGORIES = [
    { id: 11, name: 'Bags' },
    { id: 12, name: 'Fitness Equipment' },
    { id: 13, name: 'Watches' },
    { id: 14, name: 'Tops' },
    { id: 15, name: 'Bottoms' },
    { id: 16, name: 'Hoodies & Sweatshirts' },
    { id: 17, name: 'Tees' },
    { id: 18, name: 'Tanks' },
    { id: 19, name: 'Pants' },
    { id: 20, name: 'Shorts' },
    { id: 21, name: 'New Arrivals' },
    { id: 22, name: 'Sale' },
    { id: 27, name: 'Featured' },
    { id: 33, name: 'Eco-Friendly' },
    { id: 41, name: 'Outdoor' },
];

export const SHORT_DESCRIPTIONS = [
    'Lightweight & breathable for everyday wear.',
    'Built for performance, finished for style.',
    'Soft fabric with a relaxed cut.',
    'Quick-dry technical fabric — gym to street.',
    'Crafted with eco-friendly materials.',
    'Adjustable fit, all-day comfort.',
    'Bold colorways for statement looks.',
    'Cool, dry, and comfortable in every season.',
    'Minimalist design with maximum function.',
    'Engineered for movement, made for life.',
];

export const LONG_DESCRIPTION_FRAGMENTS = [
    'A versatile staple that pairs effortlessly with the rest of your wardrobe.',
    'The technical jersey wicks moisture away from the body, keeping you cool during high-intensity sessions.',
    'Reinforced stitching at high-stress points means it will keep its shape after dozens of wash cycles.',
    'Designed in collaboration with elite athletes — every detail has a purpose.',
    'Available in a curated palette of seasonal colors so it never feels out of step.',
    'Slim, considered fit. Size up if you prefer a more relaxed silhouette.',
    'Made with recycled polyester and certified organic cotton.',
    'Pre-washed for softness straight out of the bag, with minimal shrinkage over time.',
    'Tailored cuffs and a soft inside lining keep things comfortable on long days.',
    'Field-tested in everything from morning commutes to weekend hikes.',
];
