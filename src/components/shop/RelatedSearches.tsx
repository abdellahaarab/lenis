interface RelatedSearchesProps {
  terms: string[];
  language: 'ar' | 'en';
  onSelectSearch: (term: string) => void;
}

export default function RelatedSearches({ terms, language, onSelectSearch }: RelatedSearchesProps) {
  if (!terms.length) return null;
  const isAr = language === 'ar';
  return (
    <div className="store-related-row" role="navigation" aria-label={isAr ? 'عمليات بحث مرتبطة بالمنتجات' : 'Related product searches'}>
      <span className="store-related-label">{isAr ? 'منتجات مرتبطة:' : 'Related:'}</span>
      <div className="store-related-list">
        {terms.map(term => (
          <button key={term} type="button" className="store-related-link" onClick={() => onSelectSearch(term)}>
            <span>{term}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
