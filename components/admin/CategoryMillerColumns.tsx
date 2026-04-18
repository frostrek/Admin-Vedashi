'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Category } from '@/types/category';
import { getCategorySubtree, getCategoryBreadcrumb } from '@/lib/api/category';
import Link from 'next/link';

// ─── Props ────────────────────────────────────────────────────────────
interface Props {
  rootCategories: Category[];
  allCategories: Category[];
  value: string | null;
  onChange: (leafId: string, fullPath: Category[]) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────
export default function CategoryMillerColumns({
  rootCategories,
  allCategories,
  value,
  onChange,
  onLoadingChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<'select' | 'search'>('select');
  const [columns, setColumns] = useState<Category[][]>([rootCategories]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Category[]>([]);

  const searchRef = useRef<HTMLInputElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const subtreeCache = useRef<Record<string, Category[]>>({});
  const pathMap = useRef<Record<string, string>>({});
  const searchDebounceRef = useRef<number | null>(null);
  const hydrationDone = useRef(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // ─── Build path map on mount ─────────────────────────────────────
  useEffect(() => {
    buildPathMap(allCategories);
  }, [allCategories]);

  function buildPathMap(allCats: Category[]) {
    const map: Record<string, Category> = {};
    allCats.forEach(c => { map[c.category_id] = c; });

    const cache: Record<string, string> = {};
    function getPath(id: string): string {
      if (cache[id]) return cache[id];
      const cat = map[id];
      if (!cat) return '';
      if (!cat.parent_id) {
        cache[id] = cat.name;
        return cat.name;
      }
      const parentPath = getPath(cat.parent_id);
      cache[id] = parentPath ? `${parentPath} > ${cat.name}` : cat.name;
      return cache[id];
    }
    allCats.forEach(c => getPath(c.category_id));
    pathMap.current = cache;
  }

  // ─── Keep column 0 in sync with rootCategories prop ──────────────
  useEffect(() => {
    if (!hydrationDone.current && !value) {
      setColumns([rootCategories]);
    }
  }, [rootCategories, value]);

  // ─── Edit mode hydration ─────────────────────────────────────────
  useEffect(() => {
    if (!value || hydrationDone.current) return;
    if (rootCategories.length === 0) return;
    hydrationDone.current = true;
    hydrateFromValue(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, rootCategories]);

  async function hydrateFromValue(leafId: string) {
    setIsLoading(true);
    onLoadingChange?.(true);
    try {
      const breadcrumb = await getCategoryBreadcrumb(leafId);
      if (!breadcrumb.length) {
        setIsLoading(false);
        onLoadingChange?.(false);
        return;
      }

      const rootId = breadcrumb[0].category_id;

      let subtree = subtreeCache.current[rootId];
      if (!subtree) {
        subtree = await getCategorySubtree(rootId);
        subtreeCache.current[rootId] = subtree;
      }

      const newColumns: Category[][] = [rootCategories];
      const newSelectedIds: string[] = [];

      breadcrumb.forEach((ancestor, index) => {
        newSelectedIds.push(ancestor.category_id);
        if (index < breadcrumb.length - 1) {
          const children = getChildrenFromSubtree(subtree!, ancestor.category_id);
          if (children.length) newColumns.push(children);
        } else if (ancestor.has_children) {
          // Non-leaf stored value — show the next column for selection
          const children = getChildrenFromSubtree(subtree!, ancestor.category_id);
          if (children.length) newColumns.push(children);
        }
      });

      setColumns(newColumns);
      setSelectedIds(newSelectedIds);
    } catch (err) {
      console.error('CategoryMillerColumns hydration failed:', err);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  }

  // ─── Helper: get children from cached subtree ────────────────────
  function getChildrenFromSubtree(subtree: Category[], parentId: string): Category[] {
    return subtree
      .filter(c => c.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }

  // ─── Helper: find a category by ID across all columns ────────────
  function findCategoryById(id: string): Category | undefined {
    for (const col of columns) {
      const found = col.find(c => c.category_id === id);
      if (found) return found;
    }
    // Fallback to allCategories
    return allCategories.find(c => c.category_id === id);
  }

  // ─── Item click handler ──────────────────────────────────────────
  async function handleItemClick(item: Category, columnIndex: number) {
    const newSelectedIds = [...selectedIds.slice(0, columnIndex), item.category_id];
    const newColumns = [...columns.slice(0, columnIndex + 1)];

    setFetchError(null);

    if (!item.has_children) {
      setColumns(newColumns);
      setSelectedIds(newSelectedIds);
      const fullPath = newSelectedIds
        .map(id => findCategoryByIdFromColumns(id, newColumns))
        .filter(Boolean) as Category[];
      onChange(item.category_id, fullPath);
      return;
    }

    // Has children — load next column
    const rootId = newSelectedIds[0];
    let subtree = subtreeCache.current[rootId];

    if (!subtree) {
      setIsLoading(true);
      onLoadingChange?.(true);
      try {
        subtree = await getCategorySubtree(rootId);
        subtreeCache.current[rootId] = subtree;
      } catch (err) {
        setFetchError('Could not load subcategories. Try again.');
        setColumns(newColumns);
        setSelectedIds(newSelectedIds);
        setIsLoading(false);
        onLoadingChange?.(false);
        return;
      } finally {
        setIsLoading(false);
        onLoadingChange?.(false);
      }
    }

    const children = getChildrenFromSubtree(subtree, item.category_id);
    if (children.length === 0) {
      // Category claims has_children but all children deleted — treat as leaf
      setColumns(newColumns);
      setSelectedIds(newSelectedIds);
      const fullPath = newSelectedIds
        .map(id => findCategoryByIdFromColumns(id, newColumns))
        .filter(Boolean) as Category[];
      onChange(item.category_id, fullPath);
      return;
    }

    newColumns.push(children);
    setColumns(newColumns);
    setSelectedIds(newSelectedIds);

    // Auto-scroll to reveal new column
    setTimeout(() => {
      if (columnsRef.current) {
        columnsRef.current.scrollLeft = columnsRef.current.scrollWidth;
      }
    }, 50);
  }

  function findCategoryByIdFromColumns(id: string, cols: Category[][]): Category | undefined {
    for (const col of cols) {
      const found = col.find(c => c.category_id === id);
      if (found) return found;
    }
    return allCategories.find(c => c.category_id === id);
  }

  // ─── Search ──────────────────────────────────────────────────────
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = window.setTimeout(() => {
      const lower = q.toLowerCase();
      const results = allCategories.filter(c =>
        c.name.toLowerCase().includes(lower) && c.is_active
      );
      setSearchResults(results.slice(0, 30));
    }, 300);
  }

  function handleSearchSelect(item: Category) {
    // Build path by walking parent_id chain
    const catMap: Record<string, Category> = {};
    allCategories.forEach(c => { catMap[c.category_id] = c; });

    const path: Category[] = [];
    let current: Category | undefined = item;
    while (current) {
      path.unshift(current);
      current = current.parent_id ? catMap[current.parent_id] : undefined;
    }

    if (!item.has_children) {
      onChange(item.category_id, path);
    }

    setActiveTab('select');
    setSearchQuery('');
    setSearchResults([]);
    hydrateFromPath(path);
  }

  function hydrateFromPath(path: Category[]) {
    const newColumns: Category[][] = [rootCategories];
    const newSelectedIds: string[] = path.map(c => c.category_id);

    const rootId = path[0]?.category_id;
    if (!rootId) return;

    const subtree = subtreeCache.current[rootId];
    if (subtree) {
      path.forEach((ancestor, index) => {
        if (index < path.length - 1) {
          const children = getChildrenFromSubtree(subtree, ancestor.category_id);
          if (children.length) newColumns.push(children);
        } else if (ancestor.has_children) {
          const children = getChildrenFromSubtree(subtree, ancestor.category_id);
          if (children.length) newColumns.push(children);
        }
      });
    }

    setColumns(newColumns);
    setSelectedIds(newSelectedIds);
  }

  // ─── Detect non-leaf selection ───────────────────────────────────
  const isNonLeafSelected = (() => {
    if (selectedIds.length === 0) return false;
    const lastId = selectedIds[selectedIds.length - 1];
    const lastCat = findCategoryById(lastId);
    return lastCat?.has_children === true;
  })();

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--t-border)',
        marginBottom: '0',
      }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab('search');
            setTimeout(() => searchRef.current?.focus(), 100);
          }}
          style={{
            flex: 1,
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderBottom: activeTab === 'search' ? '2px solid var(--t-gold)' : '2px solid transparent',
            color: activeTab === 'search' ? 'var(--t-gold)' : 'var(--t-text-muted)',
            background: 'transparent',
          }}
        >
          Category Search
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('select')}
          style={{
            flex: 1,
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderBottom: activeTab === 'select' ? '2px solid var(--t-gold)' : '2px solid transparent',
            color: activeTab === 'select' ? 'var(--t-gold)' : 'var(--t-text-muted)',
            background: 'transparent',
          }}
        >
          Select Category
        </button>
      </div>

      {/* Panel */}
      <div style={{
        height: '320px',
        border: '1px solid var(--t-border)',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--t-card-bg)',
      }}>

        {/* SELECT TAB */}
        {activeTab === 'select' && (
          <div
            ref={columnsRef}
            className="miller-columns-scroll"
            style={{
              display: 'flex',
              height: '100%',
              overflowX: 'auto',
              overflowY: 'hidden',
            }}
          >
            {columns.map((column, colIndex) => (
              <div key={colIndex} style={{
                minWidth: '200px',
                width: '200px',
                height: '100%',
                overflowY: 'auto',
                borderRight: colIndex < columns.length - 1
                  ? '1px solid var(--t-border-subtle)' : 'none',
                flexShrink: 0,
              }}>
                {column.map(item => {
                  const isSelected = selectedIds[colIndex] === item.category_id;
                  const isHovered = hoveredItem === `${colIndex}-${item.category_id}`;
                  return (
                    <div
                      key={item.category_id}
                      onClick={() => handleItemClick(item, colIndex)}
                      onMouseEnter={() => setHoveredItem(`${colIndex}-${item.category_id}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                      title={item.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: '36px',
                        padding: '0 12px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        transition: 'background 0.15s ease',
                        background: isSelected
                          ? 'var(--t-sidebar-active)'
                          : isHovered
                            ? 'var(--t-sidebar-hover)'
                            : 'transparent',
                        color: isSelected
                          ? 'var(--t-gold-soft)'
                          : 'var(--t-text-primary)',
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}>
                        {item.name}
                      </span>
                      {item.has_children && (
                        <span style={{
                          marginLeft: '8px',
                          opacity: 0.5,
                          fontSize: '14px',
                          flexShrink: 0,
                        }}>›</span>
                      )}
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {isLoading && colIndex === columns.length - 1 && (
                  <div style={{
                    padding: '12px',
                    fontSize: '12px',
                    color: 'var(--t-text-muted)',
                  }}>
                    Loading…
                  </div>
                )}
              </div>
            ))}

            {/* Fetch error column */}
            {fetchError && (
              <div style={{
                minWidth: '200px',
                padding: '16px 12px',
                fontSize: '12px',
                color: 'var(--t-danger)',
              }}>
                <div>{fetchError}</div>
                <button
                  type="button"
                  onClick={() => {
                    setFetchError(null);
                    const lastId = selectedIds[selectedIds.length - 1];
                    const lastCol = columns[columns.length - 1];
                    const item = lastCol?.find(c => c.category_id === lastId);
                    if (item) handleItemClick(item, columns.length - 1);
                  }}
                  style={{
                    display: 'block',
                    marginTop: '10px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid var(--t-border)',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: 'var(--t-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading placeholder column */}
            {isLoading && !fetchError && (
              <div style={{
                minWidth: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--t-text-muted)',
                fontSize: '12px',
              }}>
                Loading…
              </div>
            )}
          </div>
        )}

        {/* SEARCH TAB */}
        {activeTab === 'search' && (
          <div style={{
            padding: '12px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search categories…"
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid var(--t-border)',
                borderRadius: '6px',
                outline: 'none',
                marginBottom: '8px',
                background: 'var(--surface-input)',
                color: 'var(--foreground)',
              }}
            />
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {searchResults.length === 0 && searchQuery.trim() && (
                <div style={{
                  fontSize: '12px',
                  color: 'var(--t-text-muted)',
                  padding: '12px 8px',
                  textAlign: 'center',
                }}>
                  No categories found
                </div>
              )}
              {searchResults.map(item => {
                const isItemHovered = hoveredItem === `search-${item.category_id}`;
                return (
                  <div
                    key={item.category_id}
                    onClick={() => handleSearchSelect(item)}
                    onMouseEnter={() => setHoveredItem(`search-${item.category_id}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      marginBottom: '2px',
                      transition: 'background 0.15s ease',
                      background: isItemHovered ? 'var(--t-sidebar-hover)' : 'transparent',
                    }}
                  >
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--t-text-primary)',
                      fontWeight: 500,
                    }}>
                      {item.name}
                      {item.has_children && (
                        <span style={{
                          marginLeft: '6px',
                          fontSize: '10px',
                          opacity: 0.5,
                          fontWeight: 400,
                        }}>
                          (has subcategories)
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--t-text-muted)',
                      marginTop: '2px',
                    }}>
                      {pathMap.current[item.category_id] || ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Category path breadcrumb — below the panel */}
      {selectedIds.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '4px',
          marginTop: '10px',
          fontSize: '12px',
        }}>
          {selectedIds.map((id, index) => {
            const cat = findCategoryById(id);
            if (!cat) return null;
            const isLast = index === selectedIds.length - 1;
            return (
              <span key={id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {index > 0 && (
                  <span style={{ color: 'var(--t-text-muted)', fontSize: '11px' }}>›</span>
                )}
                <span style={{
                  color: isLast ? 'var(--t-gold-soft)' : 'var(--t-text-muted)',
                  fontWeight: isLast ? 600 : 400,
                }}>
                  {cat.name}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Non-leaf warning */}
      {isNonLeafSelected && (
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: 'var(--t-warning)',
          background: 'rgba(155, 138, 79, 0.08)',
          padding: '6px 10px',
          borderRadius: '6px',
          borderLeft: '3px solid var(--t-warning)',
        }}>
          Please select a more specific subcategory
        </div>
      )}

      {/* + New Category link */}
      <div style={{ marginTop: '10px' }}>
        <Link
          href="/dashboard/categories"
          style={{
            fontSize: '12px',
            color: 'var(--t-text-muted)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'color 0.2s ease',
          }}
        >
          + New Category
        </Link>
      </div>

      {/* Hide scrollbar for Miller Columns */}
      <style jsx>{`
        .miller-columns-scroll::-webkit-scrollbar {
          display: none;
        }
        .miller-columns-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>
    </div>
  );
}
