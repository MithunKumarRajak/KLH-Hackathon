import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ChefHat, ArrowRight, Clock, Tag, BarChart3, Trash2 } from 'lucide-react';
import gsap from 'gsap';
import anime from 'animejs/lib/anime.es.js';
import { recipeAPI } from '../services/api';
import './RecipeList.css';

function RecipeList() {
  const headerRef = useRef(null);
  const searchRef = useRef(null);
  const gridRef = useRef(null);
  const [recipes, setRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState('');

  const fetchRecipes = () => {
    setLoading(true);
    recipeAPI.list({ q: searchTerm || undefined })
      .then(res => setRecipes(res.data.recipes || res.data.results || []))
      .catch(err => {
        setDeleteError(err.response?.data?.error || 'Failed to load recipes');
        setTimeout(() => setDeleteError(''), 4000);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(fetchRecipes, searchTerm ? 400 : 0);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(headerRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
      )
      .fromTo(searchRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
        '-=0.3'
      );
  }, []);

  useEffect(() => {
    if (gridRef.current && !loading) {
      anime({
        targets: gridRef.current.children,
        opacity: [0, 1],
        translateY: [40, 0],
        delay: anime.stagger(100, { start: 100 }),
        duration: 700,
        easing: 'easeOutQuart',
      });
    }
  }, [loading, recipes]);

  const handleDelete = async (recipeId) => {
    if (!window.confirm('Delete this recipe? This action cannot be undone.')) return;
    setDeleteError('');
    try {
      await recipeAPI.delete(recipeId);
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to delete recipe';
      setDeleteError(msg);
      setTimeout(() => setDeleteError(''), 4000);
    }
  };

  const filtered = recipes.filter(r => {
    if (filter === 'all') return true;
    const status = r.compliance || 'pending';
    return status === filter;
  });

  const getComplianceBadge = (status) => {
    const map = {
      compliant: { label: 'Compliant', className: 'badge-success' },
      'non-compliant': { label: 'Non-Compliant', className: 'badge-error' },
      pending: { label: 'Pending', className: 'badge-warning' },
    };
    const info = map[status] || map.pending;
    return <span className={`recipe-badge ${info.className}`}>{info.label}</span>;
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week(s) ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="recipe-list-page">
      <div className="recipe-list-header" ref={headerRef}>
        <div className="container">
          <div className="recipe-list-header-inner">
            <div>
              <p className="section-label">Your Recipes</p>
              <h1>Recipe Collection</h1>
              <p className="recipe-list-subtitle">Manage and analyze all your food product recipes</p>
            </div>
            <Link to="/recipes/create" className="btn btn-primary">
              <Plus size={18} />
              <span>New Recipe</span>
            </Link>
          </div>
        </div>
      </div>

      <section className="section recipe-list-controls" ref={searchRef}>
        <div className="container">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search recipes by name, brand, or ingredient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-tags">
            {['all', 'compliant', 'non-compliant', 'pending'].map(f => (
              <button key={f} className={`filter-tag ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'non-compliant' ? 'Non-Compliant' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {deleteError && (
            <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #dc2626', color: '#dc2626', fontSize: 14 }}>
              {deleteError}
            </div>
          )}
          {loading ? (
            <p style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>Loading recipes...</p>
          ) : (
            <div className="recipe-grid" ref={gridRef}>
              {filtered.map((recipe) => (
                <div className="recipe-card" key={recipe.id}>
                  <div className="recipe-card-top">
                    <div className="recipe-card-icon">
                      <ChefHat size={24} />
                    </div>
                    {getComplianceBadge(recipe.compliance || 'pending')}
                  </div>

                  <h3 className="recipe-card-title">{recipe.name}</h3>
                  <p className="recipe-card-brand">{recipe.brand_name || ''}</p>

                  <div className="recipe-card-meta">
                    <span><Tag size={14} /> {recipe.ingredient_count ?? '?'} ingredients</span>
                    <span><BarChart3 size={14} /> {recipe.serving_size}{recipe.serving_unit}</span>
                    <span><Clock size={14} /> {timeAgo(recipe.created_at)}</span>
                    {recipe.manufacturer && <span>Mfr: {recipe.manufacturer}</span>}
                    {recipe.allergen_info && <span className="recipe-allergen-tag">Allergens: {recipe.allergen_info}</span>}
                  </div>

                  <div className="recipe-card-actions">
                    <Link to={`/recipes/${recipe.id}/analyze`} className="btn btn-secondary btn-sm">
                      <BarChart3 size={14} />
                      <span>Analyze</span>
                    </Link>
                    <Link to={`/recipes/${recipe.id}/label`} className="btn btn-primary btn-sm">
                      <span>View Label</span>
                      <ArrowRight size={14} />
                    </Link>
                    <button className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(recipe.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <Link to="/recipes/create" className="recipe-card recipe-card-new">
                <div className="recipe-card-new-inner">
                  <Plus size={32} />
                  <p>Create New Recipe</p>
                </div>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default RecipeList;
