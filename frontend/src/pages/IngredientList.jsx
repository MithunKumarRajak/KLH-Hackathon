import { useEffect, useRef, useState } from 'react';
import { Search, Leaf, Apple, Wheat, Droplets, Flame, Info, ChevronDown, X } from 'lucide-react';
import gsap from 'gsap';
import anime from 'animejs/lib/anime.es.js';
import { ingredientAPI } from '../services/api';
import './IngredientList.css';

function IngredientList() {
  const headerRef = useRef(null);
  const tableRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const catRef = useRef(null);
  const PER_PAGE = 50;

  const fetchIngredients = () => {
    setLoading(true);
    const params = {};
    if (searchTerm) params.q = searchTerm;
    if (activeCategory !== 'All') params.category = activeCategory;
    ingredientAPI.list(params)
      .then(res => {
        setIngredients(res.data.ingredients || res.data.results || []);
        if (res.data.categories) {
          setCategories(['All', ...res.data.categories]);
        }
      })
      .catch(err => { setError(err.response?.data?.error || 'Failed to load ingredients') })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(fetchIngredients, searchTerm || activeCategory !== 'All' ? 400 : 0);
    return () => clearTimeout(t);
  }, [searchTerm, activeCategory]);

  useEffect(() => { setPage(1); }, [searchTerm, activeCategory]);

  useEffect(() => {
    gsap.fromTo(
      headerRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
    );
  }, []);

  useEffect(() => {
    if (tableRef.current && !loading) {
      const rows = tableRef.current.querySelectorAll('.ingredient-row');
      anime({
        targets: rows,
        opacity: [0, 1],
        translateX: [-20, 0],
        delay: anime.stagger(30, { start: 50 }),
        duration: 400,
        easing: 'easeOutQuart',
      });
    }
  }, [loading, ingredients, page]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) setCatDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getCategoryIcon = (category) => {
    const icons = {
      Cereals: <Wheat size={16} />,
      Pulses: <Leaf size={16} />,
      Fruits: <Apple size={16} />,
      Vegetables: <Leaf size={16} />,
      Dairy: <Droplets size={16} />,
      Oils: <Droplets size={16} />,
      Spices: <Flame size={16} />,
      Nuts: <Leaf size={16} />,
    };
    return icons[category] || <Info size={16} />;
  };

  const filteredCats = categories.filter(c =>
    c.toLowerCase().includes(catSearch.toLowerCase())
  );

  const paginated = ingredients.slice(0, page * PER_PAGE);
  const hasMore = paginated.length < ingredients.length;

  return (
    <div className="ingredient-list-page">
      <div className="ingredient-list-header" ref={headerRef}>
        <div className="container">
          <p className="il-header-label">Database</p>
          <h1 className="il-header-title">Ingredient Library</h1>
          <p className="il-header-subtitle">
            Browse the Indian food nutrition database — search, filter, and explore nutrient data for your recipes.
          </p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="il-filter-row">
            <div className="ingredient-search-bar">
              <Search size={18} className="ingredient-search-icon" />
              <input
                type="text"
                placeholder="Search ingredients by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="cat-dropdown-wrap" ref={catRef}>
              <button
                className={`cat-dropdown-btn ${activeCategory !== 'All' ? 'has-value' : ''}`}
                onClick={() => setCatDropdownOpen(!catDropdownOpen)}
              >
                <span>{activeCategory === 'All' ? 'All Categories' : activeCategory}</span>
                {activeCategory !== 'All' ? (
                  <X size={14} className="cat-clear" onClick={(e) => { e.stopPropagation(); setActiveCategory('All'); setCatDropdownOpen(false); }} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
              {catDropdownOpen && (
                <div className="cat-dropdown-menu">
                  <div className="cat-dropdown-search">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={catSearch}
                      onChange={(e) => setCatSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="cat-dropdown-list">
                    {filteredCats.map(cat => (
                      <button
                        key={cat}
                        className={`cat-dropdown-item ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => { setActiveCategory(cat); setCatDropdownOpen(false); setCatSearch(''); }}
                      >
                        {cat === 'All' ? 'All Categories' : cat}
                      </button>
                    ))}
                    {filteredCats.length === 0 && (
                      <p className="cat-dropdown-empty">No categories match</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>Loading ingredients...</p>
          ) : (
            <div className="ingredient-table-wrapper">
              <table className="ingredient-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Ingredient</th>
                    <th style={{ width: '20%' }}>Category</th>
                    <th style={{ width: '12.5%' }}>Energy (kcal)</th>
                    <th style={{ width: '12.5%' }}>Protein (g)</th>
                    <th style={{ width: '12.5%' }}>Fat (g)</th>
                    <th style={{ width: '12.5%' }}>Carbs (g)</th>
                  </tr>
                </thead>
                <tbody ref={tableRef}>
                  {paginated.map((ing) => (
                    <tr key={ing.id} className="ingredient-row">
                      <td>
                        <div className="ingredient-name-cell">
                          <span className="ingredient-icon-sm">{getCategoryIcon(ing.category)}</span>
                          <span className="ingredient-name-text">{ing.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="category-pill">{ing.category || 'Other'}</span>
                      </td>
                      <td className="nutrient-val">{ing.energy ?? '--'}</td>
                      <td className="nutrient-val">{ing.protein ?? '--'}</td>
                      <td className="nutrient-val">{ing.fat ?? '--'}</td>
                      <td className="nutrient-val">{ing.carbs ?? '--'}</td>
                    </tr>
                  ))}
                  {ingredients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty-state">
                        No ingredients found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="il-table-footer">
            <p className="ingredient-count">
              Showing {paginated.length} of {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
            </p>
            {hasMore && (
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)}>
                Load More
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default IngredientList;
