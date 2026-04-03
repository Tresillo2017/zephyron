// Genre inference utility — regex-based, no AI
// Used by createSetFromYoutube to guess genre from YouTube keywords.

/**
 * Simple genre inference from YouTube keywords.
 */
export function inferGenreFromKeywords(keywords: string[]): string {
  const tagStr = keywords.join(' ').toLowerCase()
  const genreMap: [string, string][] = [
    ['techno', 'Techno'],
    ['house', 'House'],
    ['trance', 'Trance'],
    ['drum and bass', 'Drum & Bass'],
    ['dnb', 'Drum & Bass'],
    ['d&b', 'Drum & Bass'],
    ['dubstep', 'Dubstep'],
    ['minimal', 'Minimal'],
    ['progressive', 'Progressive'],
    ['hardstyle', 'Hardstyle'],
    ['disco', 'Disco'],
    ['electro', 'Electro'],
    ['ambient', 'Ambient'],
    ['breaks', 'Breaks'],
    ['garage', 'Garage'],
    ['acid', 'Acid'],
    ['industrial', 'Industrial'],
    ['downtempo', 'Downtempo'],
  ]

  for (const [keyword, genre] of genreMap) {
    if (tagStr.includes(keyword)) return genre
  }
  return ''
}
