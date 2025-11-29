// API Configuration
const API_BASE = window.CONFIG ? window.CONFIG.API_BASE : '/api';

// Global State
let currentPage = 1;
let currentCategory = 'all';
let isLoading = false;
let hasMoreArticles = true;

// DOM Elements
const articlesContainer = document.getElementById('articlesContainer');
const featuredContainer = document.getElementById('featuredArticles');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const sectionTitle = document.getElementById('sectionTitle');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const newsletterForm = document.getElementById('newsletterForm');
const contactForm = document.getElementById('contactForm');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadFeaturedArticles();
    loadArticles();
    setupEventListeners();
    showToast('Welcome to Sport Buzz!', 'info');
});

// Event Listeners
function setupEventListeners() {
    // Category navigation
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.getAttribute('data-category');
            setActiveCategory(category);
        });
    });

    // Footer category links
    document.querySelectorAll('.footer-links a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.getAttribute('data-category');
            if (category) {
                setActiveCategory(category);
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });

    // Load more articles
    loadMoreBtn.addEventListener('click', loadMoreArticles);

    // Search functionality
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Newsletter form
    newsletterForm.addEventListener('submit', handleNewsletterSubmit);

    // Contact form
    contactForm.addEventListener('submit', handleContactSubmit);

    // Explore button
    document.getElementById('exploreBtn').addEventListener('click', () => {
        document.querySelector('.articles-grid').scrollIntoView({ 
            behavior: 'smooth' 
        });
    });
}

// Load featured articles
async function loadFeaturedArticles() {
    try {
        showLoading(featuredContainer);
        
        const response = await fetch(`${API_BASE}/articles/featured`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to load featured articles');
        }

        if (data.articles && data.articles.length > 0) {
            renderFeaturedArticles(data.articles);
        } else {
            featuredContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-star"></i>
                    <h3>No Featured Articles</h3>
                    <p>Check back later for featured stories</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading featured articles:', error);
        featuredContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to Load Featured Articles</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// Load articles
async function loadArticles(reset = true) {
    if (isLoading) return;
    
    isLoading = true;
    
    if (reset) {
        currentPage = 1;
        hasMoreArticles = true;
        showLoading(articlesContainer);
    }

    try {
        const params = new URLSearchParams({
            category: currentCategory === 'all' ? '' : currentCategory,
            page: currentPage,
            limit: 9
        });

        const response = await fetch(`${API_BASE}/articles?${params}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to load articles');
        }

        if (reset) {
            articlesContainer.innerHTML = '';
        }

        if (data.articles && data.articles.length > 0) {
            renderArticles(data.articles);
            currentPage++;
            hasMoreArticles = data.pagination.hasNext;
            
            if (!hasMoreArticles) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'block';
            }
        } else {
            if (reset) {
                articlesContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-newspaper"></i>
                        <h3>No Articles Found</h3>
                        <p>No articles available for this category.</p>
                    </div>
                `;
            }
            loadMoreBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading articles:', error);
        if (reset) {
            articlesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to Load Articles</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
        showToast('Failed to load articles', 'error');
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Load more articles
function loadMoreArticles() {
    if (!isLoading && hasMoreArticles) {
        loadArticles(false);
    }
}

// Handle search
function handleSearch() {
    const query = searchInput.value.trim();
    if (query) {
        searchArticles(query);
    } else {
        loadArticles(true);
    }
}

// Search articles
async function searchArticles(query) {
    try {
        showLoading(articlesContainer);
        
        const params = new URLSearchParams({
            search: query,
            page: 1,
            limit: 12
        });

        const response = await fetch(`${API_BASE}/articles?${params}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Search failed');
        }

        articlesContainer.innerHTML = '';

        if (data.articles && data.articles.length > 0) {
            renderArticles(data.articles);
            sectionTitle.textContent = `Search Results for "${query}"`;
            showToast(`Found ${data.articles.length} articles`, 'success');
        } else {
            articlesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No Articles Found</h3>
                    <p>No articles match your search criteria.</p>
                </div>
            `;
            sectionTitle.textContent = `Search Results for "${query}"`;
        }

        loadMoreBtn.style.display = 'none';
    } catch (error) {
        console.error('Search error:', error);
        showToast('Search failed', 'error');
    }
}

// Helper function to get correct image URL
function getImageUrl(imagePath) {
    if (!imagePath) {
        return 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80';
    }
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) {
        return imagePath;
    }
    
    // For relative paths, use the current origin
    if (imagePath.startsWith('/uploads')) {
        return imagePath; // This will be relative to current domain
    }
    
    // If it's just a filename, prepend uploads path
    return `/uploads/images/${imagePath}`;
}

// Render featured articles - FIXED IMAGE PATHS
function renderFeaturedArticles(articles) {
    const featuredHTML = articles.map(article => `
        <div class="featured-article" onclick="viewArticle('${article._id}')">
           <img src="${getImageUrl(article.image)}" 
                 alt="${article.title}" 
                 class="featured-article-image">
            <div class="featured-article-content">
                <span class="featured-badge">Featured</span>
                <h3 class="featured-article-title">${article.title}</h3>
                <p class="featured-article-excerpt">${article.excerpt || (article.content ? article.content.substring(0, 120) + '...' : 'No content available')}</p>
                <div class="featured-article-meta">
                    <span><i class="far fa-calendar"></i> ${formatDate(article.createdAt)}</span>
                    <span><i class="far fa-eye"></i> ${article.views || 0} views</span>
                </div>
            </div>
        </div>
    `).join('');

    featuredContainer.innerHTML = featuredHTML;
}

// Render articles - FIXED IMAGE PATHS
function renderArticles(articles) {
    const articlesHTML = articles.map(article => `
        <div class="article-card" onclick="viewArticle('${article._id}')">
            <img src="${getImageUrl(article.image)}" 
                 alt="${article.title}" 
                 class="article-image">
            <div class="article-content">
                <span class="article-category">${article.category}</span>
                <h3 class="article-title">${article.title}</h3>
                <p class="article-excerpt">${article.excerpt || (article.content ? article.content.substring(0, 100) + '...' : 'No content available')}</p>
                <div class="article-meta">
                    <span><i class="far fa-calendar"></i> ${formatDate(article.createdAt)}</span>
                    <span><i class="far fa-eye"></i> ${article.views || 0} views</span>
                </div>
            </div>
        </div>
    `).join('');

    if (currentPage === 1) {
        articlesContainer.innerHTML = articlesHTML;
    } else {
        articlesContainer.insertAdjacentHTML('beforeend', articlesHTML);
    }
}

// Set active category
function setActiveCategory(category) {
    currentCategory = category;
    
    // Update active nav link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // Update section title
    sectionTitle.textContent = category === 'all' 
        ? 'Latest Sports News' 
        : `${category.charAt(0).toUpperCase() + category.slice(1)} News`;
    
    // Reset search
    searchInput.value = '';
    
    // Reload articles
    loadArticles(true);
}

// View article - FIXED: Simple redirect only
function viewArticle(articleId) {
    console.log('🔗 Redirecting to article:', articleId);
    window.location.href = `article.html?id=${articleId}`;
}

// Handle newsletter subscription
async function handleNewsletterSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('input').value;

    try {
        const response = await fetch(`${API_BASE}/subscribers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Successfully subscribed to newsletter!', 'success');
            form.reset();
        } else {
            showToast(data.message || 'Subscription failed', 'error');
        }
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        showToast('Subscription failed. Please try again.', 'error');
    }
}

// Handle contact form
async function handleContactSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const contactData = {
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject') || 'No subject',
        message: formData.get('message')
    };

    try {
        const response = await fetch(`${API_BASE}/contacts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(contactData)
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Message sent successfully! We will get back to you soon.', 'success');
            form.reset();
        } else {
            showToast(data.message || 'Failed to send message', 'error');
        }
    } catch (error) {
        console.error('Contact form error:', error);
        showToast('Failed to send message. Please try again.', 'error');
    }
}

// Utility functions
function showLoading(container = articlesContainer) {
    container.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading...</p>
        </div>
    `;
}

function hideLoading() {
    const spinner = document.querySelector('.loading-spinner');
    if (spinner && spinner.parentElement === articlesContainer) {
        spinner.remove();
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

// Export functions for global access
window.viewArticle = viewArticle;