/**
 * Image credits. All photos from Unsplash, Unsplash License (free for
 * commercial use, no attribution required, but we keep attribution for ethics
 * and so the client can swap to commissioned photography later).
 *
 * Re-export from this module if you ever surface credits in a /colophon page.
 */
import type { Locale } from '@/i18n/t';

export interface PhotoCredit {
  file: string;
  photographer: string;
  source: string;
  alt: { ja: string; zh: string };
}

export const photoCredits: ReadonlyArray<PhotoCredit> = [
  {
    file: 'home-hero.jpg',
    photographer: 'Tianshu Liu',
    source: 'https://unsplash.com/photos/photo-1528164344705-47542687000d',
    alt: {
      ja: '夕暮れの新倉山浅間公園、五重塔と富士山',
      zh: '黄昏的新仓山浅间公园、五重塔与富士山',
    },
  },
  {
    file: 'home-fuji.jpg',
    photographer: 'Tomáš Malík',
    source: 'https://unsplash.com/photos/photo-1490806843957-31f4c9a91c65',
    alt: { ja: '桜越しに望む冠雪の富士山', zh: '透过樱花仰望雪顶富士山' },
  },
  {
    file: 'home-shinjuku.jpg',
    photographer: 'Jezael Melgoza',
    source: 'https://unsplash.com/photos/photo-1503899036084-c55cdd92da26',
    alt: { ja: '夜の新宿、ネオン街並み', zh: '夜晚的新宿霓虹街景' },
  },
  {
    file: 'airport-hero.jpg',
    photographer: 'Jezael Melgoza',
    source: 'https://unsplash.com/photos/photo-1542051841857-5f90071e7989',
    alt: { ja: '渋谷スクランブル交差点、夜', zh: '涩谷十字路口的夜晚' },
  },
  {
    file: 'charter-hero.jpg',
    photographer: 'Sorasak',
    source: 'https://unsplash.com/photos/photo-1493780474015-ba834fd0ce2f',
    alt: {
      ja: '京都祇園、和傘を差して歩く女性',
      zh: '京都祇园，撑伞步行的女性',
    },
  },
  {
    file: 'ski-hero.jpg',
    photographer: 'Maarten Duineveld',
    source: 'https://unsplash.com/photos/photo-1551524559-8af4e6624178',
    alt: { ja: '雪山で空中を舞うスキーヤー', zh: '雪山中腾空跃起的滑雪者' },
  },
  {
    file: 'ski-alps.jpg',
    photographer: 'Samuel Ferrara',
    source: 'https://unsplash.com/photos/photo-1483921020237-2ff51e8e4b22',
    alt: { ja: '雪に覆われたアルプスの稜線', zh: '雪覆盖的阿尔卑斯山脊' },
  },
  {
    file: 'rental-hero.jpg',
    photographer: 'Tianshu Liu',
    source: 'https://unsplash.com/photos/photo-1480796927426-f609979314bd',
    alt: { ja: '京都の伝統的な商店の正面', zh: '京都传统店铺正面' },
  },
  {
    file: 'vehicles-hero.jpg',
    photographer: 'Mike',
    source: 'https://unsplash.com/photos/photo-1485291571150-772bcfc10da5',
    alt: { ja: '黒い高級セダンのシルエット', zh: '黑色高级轿车的剪影' },
  },
  {
    file: 'pricing-hero.jpg',
    photographer: 'Yu Kato',
    source: 'https://unsplash.com/photos/photo-1545569341-9eb8b30979d9',
    alt: { ja: '夕暮れの京都、清水寺の三重塔', zh: '黄昏的京都、清水寺三重塔' },
  },
  {
    file: 'about-hero.jpg',
    photographer: 'David Edelstein',
    source: 'https://unsplash.com/photos/photo-1492571350019-22de08371fd3',
    alt: { ja: '箱根芦ノ湖、平和の鳥居', zh: '箱根芦之湖、平和鸟居' },
  },
  {
    file: 'faq-hero.jpg',
    photographer: 'Sora Sagano',
    source: 'https://unsplash.com/photos/photo-1542931287-023b922fa89b',
    alt: { ja: '桜咲く東京の街路', zh: '樱花盛开的东京街道' },
  },
  {
    file: 'inquiry-hero.jpg',
    photographer: 'Andre Benz',
    source: 'https://unsplash.com/photos/photo-1528360983277-13d401cdc186',
    alt: { ja: '夜の路地、赤い提灯', zh: '夜晚的小巷与红色灯笼' },
  },
  {
    file: 'cabin-detail.png',
    photographer: 'Generated for SevenSeatJP',
    source: 'in-house',
    alt: {
      ja: '後部座席、黒革のキャプテンシートとウッドトリム',
      zh: '专车后排真皮独立座椅与木纹饰板特写',
    },
  },
] as const;

/**
 * Look up alt text for a photo by file name. Throws at build time if no
 * credit exists for the file — surfacing a11y regressions instead of
 * silently rendering an empty `alt`.
 */
export function getPhotoAlt(file: string, locale: Locale): string {
  const credit = photoCredits.find((c) => c.file === file);
  if (!credit) {
    throw new Error(
      `[credits] no photo credit registered for "${file}". ` +
        'Add an entry to photoCredits or fix the file name.',
    );
  }
  return credit.alt[locale];
}
