// FULLY WORKING ADMIN.JS WITH DEBUG FIXES
console.log('🚀 ADMIN.JS LOADED - Data loading ENABLED', new Date().toLocaleTimeString());

const API_BASE = 'https://sportsbuzz-pnpa.onrender.com/api';
let authToken = localStorage.getItem('adminToken');
let currentUser = null;
let currentCharts = {};

console.log('🔐 Initial authToken:', authToken ? 'EXISTS' : 'MISSING');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM Content Loaded - Starting auth check');
    checkAuthStatus();
    setupEventListeners();
});

function setupEventListeners() {
    console.log('🔧 Setting up event listeners');
    
    // Login form
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleLogin);
        console.log('✅ Login form listener added');
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('✅ Logout button listener added');
    }

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            console.log('📑 Tab clicked:', tabName);
            switchTab(tabName);
        });
    });

    // Article form
    const articleForm = document.getElementById('addArticleForm');
    if (articleForm) {
        articleForm.addEventListener('submit', handleArticleSubmit);
        console.log('✅ Article form listener added');
    }
    
    const articleImage = document.getElementById('articleImage');
    if (articleImage) {
        articleImage.addEventListener('change', handleImagePreview);
    }
    
    const removeImage = document.getElementById('removeImage');
    if (removeImage) {
        removeImage.addEventListener('click', removeImagePreview);
    }

    // Search functionality
    const searchArticlesBtn = document.getElementById('searchArticlesBtn');
    if (searchArticlesBtn) {
        searchArticlesBtn.addEventListener('click', handleArticleSearch);
    }

    const articleSearch = document.getElementById('articleSearch');
    if (articleSearch) {
        articleSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleArticleSearch();
            }
        });
    }

    // Comment filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadComments(filter);
        });
    });

    console.log('🏗️ DOM Elements:', {
        loginForm: !!adminLoginForm,
        logoutBtn: !!logoutBtn,
        articleForm: !!articleForm,
        tabs: document.querySelectorAll('.tab-btn').length
    });
}

async function checkAuthStatus() {
    console.log('🔐 checkAuthStatus called');
    console.log('📦 authToken:', authToken);
    
    if (!authToken) {
        console.log('❌ No auth token - showing login');
        showLogin();
        return;
    }

    try {
        console.log('🔑 Verifying token...');
        const response = await fetch(`${API_BASE}/auth/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Auth verify response status:', response.status);
        const data = await response.json();
        console.log('🔑 Auth verify data:', data);

        if (response.ok && data.success) {
            console.log('✅ Token valid - User:', data.user);
            currentUser = data.user;
            showDashboard();
            loadDashboardData();
        } else {
            throw new Error(data.message || 'Invalid token');
        }
    } catch (error) {
        console.error('❌ Auth verification failed:', error);
        localStorage.removeItem('adminToken');
        showLogin();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('loginMessage');

    console.log('🔐 Login attempt:', { username, password: '***' });

    // Clear previous messages
    if (messageDiv) {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        console.log('📡 Login response:', data);

        if (response.ok && data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('adminToken', authToken);
            console.log('✅ Login successful, token saved');
            showDashboard();
            loadDashboardData();
            showToast('Login successful!', 'success');
        } else {
            const errorMsg = data.message || 'Login failed';
            console.error('❌ Login failed:', errorMsg);
            if (messageDiv) {
                messageDiv.textContent = errorMsg;
                messageDiv.className = 'message error';
            }
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        const errorMsg = 'Login failed. Please try again.';
        if (messageDiv) {
            messageDiv.textContent = errorMsg;
            messageDiv.className = 'message error';
        }
    }
}

function handleLogout() {
    console.log('🚪 Logging out...');
    authToken = null;
    currentUser = null;
    localStorage.removeItem('adminToken');
    showLogin();
    showToast('Logged out successfully', 'info');
}

function showLogin() {
    console.log('👤 Showing login screen');
    const loginContainer = document.getElementById('loginContainer');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (loginContainer) loginContainer.style.display = 'flex';
    if (adminDashboard) adminDashboard.style.display = 'none';
}

function showDashboard() {
    console.log('📊 Showing dashboard');
    const loginContainer = document.getElementById('loginContainer');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (loginContainer) {
        loginContainer.style.display = 'none';
        console.log('✅ Login container hidden');
    }
    if (adminDashboard) {
        adminDashboard.style.display = 'block';
        console.log('✅ Dashboard shown');
    }
    
    const adminWelcome = document.getElementById('adminWelcome');
    if (adminWelcome && currentUser) {
        adminWelcome.textContent = `Welcome, ${currentUser.username}`;
        console.log('✅ Welcome message updated');
    }
}

// Tab Management
function switchTab(tabName) {
    console.log('📑 Switching to tab:', tabName);
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-tab') === tabName) {
            button.classList.add('active');
        }
    });

    // Show active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabName}-tab`) {
            content.classList.add('active');
            console.log('✅ Tab content activated:', content.id);
        }
    });

    // Load tab-specific data
    console.log('🚀 Loading data for tab:', tabName);
    switch(tabName) {
        case 'dashboard':
            console.log('📊 Calling loadAnalytics()...');
            loadAnalytics();
            break;
        case 'articles':
            console.log('📝 Calling loadArticles()...');
            loadArticles();
            break;
        case 'comments':
            console.log('💬 Calling loadComments()...');
            loadComments();
            break;
        case 'subscribers':
            console.log('👥 Calling loadSubscribers()...');
            loadSubscribers();
            break;
        case 'contacts':
            console.log('📧 Calling loadContacts()...');
            loadContacts();
            break;
        case 'add-article':
            console.log('➕ Add article tab - no data to load');
            break;
        default:
            console.log('❌ Unknown tab:', tabName);
    }
}

// Dashboard Analytics - FIXED VERSION
async function loadAnalytics() {
    console.log('🎯 loadAnalytics() called');
    
    try {
        console.log('⏳ Showing loading state...');
        showLoading('dashboard-tab');
        
        console.log('📡 Making API request to:', `${API_BASE}/analytics/overview`);
        const response = await fetch(`${API_BASE}/analytics/overview`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📊 Analytics response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ HTTP Error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📈 Analytics data received:', data);

        if (data.success) {
            console.log('✅ Analytics data successful, rendering...');
            console.log('📊 Today views:', data.analytics.today?.views);
            console.log('📝 Top articles count:', data.analytics.topArticles?.length);
            console.log('📅 Daily views count:', data.analytics.dailyViews?.length);
            
            renderStats(data.analytics);
            renderCharts(data.analytics);
            renderTopArticles(data.analytics.topArticles);
            console.log('🎉 Dashboard fully loaded!');
        } else {
            throw new Error(data.message || 'Failed to load analytics');
        }
    } catch (error) {
        console.error('❌ Analytics load error:', error);
        showError('dashboard-tab', 'Failed to load analytics data: ' + error.message);
        
        // If it's a fresh install with no data, create test data
        if (error.message.includes('Failed to load analytics')) {
            console.log('🔄 Attempting to create test data...');
            createTestData();
        }
    }
}

// Create test data for fresh installation
async function createTestData() {
    try {
        console.log('🎯 Creating test analytics data...');
        const response = await fetch(`${API_BASE}/analytics/create-test-data`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('✅ Test data created, reloading analytics...');
            loadAnalytics(); // Reload after creating test data
        }
    } catch (error) {
        console.error('❌ Failed to create test data:', error);
    }
}

function renderStats(analytics) {
    console.log('📈 Rendering stats:', analytics);
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) {
        console.error('❌ Stats grid element not found');
        return;
    }
    
    const statsHTML = `
        <div class="stat-card">
            <i class="fas fa-eye"></i>
            <div class="stat-number">${analytics.today?.views?.toLocaleString() || 0}</div>
            <div class="stat-label">Today's Views</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-calendar-week"></i>
            <div class="stat-number">${analytics.week?.views?.toLocaleString() || 0}</div>
            <div class="stat-label">This Week</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-calendar-alt"></i>
            <div class="stat-number">${analytics.month?.views?.toLocaleString() || 0}</div>
            <div class="stat-label">This Month</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-newspaper"></i>
            <div class="stat-number">${analytics.totals?.articles?.toLocaleString() || analytics.topArticles?.length?.toLocaleString() || 0}</div>
            <div class="stat-label">Total Articles</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-users"></i>
            <div class="stat-number">${analytics.totals?.subscribers?.toLocaleString() || 0}</div>
            <div class="stat-label">Subscribers</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-comments"></i>
            <div class="stat-number">${analytics.totals?.comments?.toLocaleString() || 0}</div>
            <div class="stat-label">Comments</div>
        </div>
    `;

    statsGrid.innerHTML = statsHTML;
    console.log('✅ Stats rendered successfully');
}

function renderCharts(analytics) {
    console.log('📊 Rendering charts...');
    renderViewsChart(analytics.dailyViews || []);
    renderCategoriesChart(analytics.categoryStats || []);
}

function renderViewsChart(dailyViews) {
    const ctx = document.getElementById('viewsChart');
    if (!ctx) {
        console.error('❌ Views chart canvas not found');
        return;
    }
    
    console.log('📈 Rendering views chart with data:', dailyViews);

    // Destroy previous chart if exists
    if (currentCharts.views) {
        currentCharts.views.destroy();
    }

    const labels = dailyViews.map(day => {
        const date = new Date(day.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const data = dailyViews.map(day => day.views);

    // If no data, show empty state
    if (data.length === 0 || data.every(val => val === 0)) {
        console.log('📊 No view data available for chart');
        ctx.parentElement.innerHTML = `
            <h4>Views Over Time</h4>
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <p>No view data available yet</p>
                <small>Views will appear after visitors read articles</small>
            </div>
        `;
        return;
    }

    currentCharts.views = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Daily Views',
                data: data,
                borderColor: '#0085C7',
                backgroundColor: 'rgba(0, 133, 199, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    console.log('✅ Views chart rendered');
}

function renderCategoriesChart(categoryStats) {
    const ctx = document.getElementById('categoriesChart');
    if (!ctx) {
        console.error('❌ Categories chart canvas not found');
        return;
    }
    
    console.log('🏷️ Rendering categories chart with data:', categoryStats);

    // Destroy previous chart if exists
    if (currentCharts.categories) {
        currentCharts.categories.destroy();
    }

    // If no data, show empty state
    if (!categoryStats || categoryStats.length === 0) {
        console.log('📊 No category data available for chart');
        ctx.parentElement.innerHTML = `
            <h4>Top Categories</h4>
            <div class="empty-state">
                <i class="fas fa-chart-pie"></i>
                <p>No category data available yet</p>
                <small>Data will appear when articles are published</small>
            </div>
        `;
        return;
    }

    const labels = categoryStats.map(cat => cat._id.charAt(0).toUpperCase() + cat._id.slice(1));
    const data = categoryStats.map(cat => cat.totalViews || cat.count);
    const backgroundColors = [
        '#ED2939', '#0085C7', '#F4C300', '#009F3D',
        '#9C27B0', '#FF9800', '#795548'
    ];

    currentCharts.categories = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    console.log('✅ Categories chart rendered');
}

function renderTopArticles(articles) {
    const container = document.getElementById('topArticlesList');
    if (!container) {
        console.error('❌ Top articles container not found');
        return;
    }
    
    console.log('📝 Rendering top articles:', articles?.length);

    if (!articles || articles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-newspaper"></i>
                <h4>No Articles Yet</h4>
                <p>Start publishing to see analytics</p>
                <button class="btn btn-primary" onclick="switchTab('add-article')">
                    Create First Article
                </button>
            </div>
        `;
        return;
    }

    const articlesHTML = articles.map((article, index) => `
        <div class="top-article-item">
            <div class="article-rank">${index + 1}</div>
            <div class="article-info">
                <h5>${article.title}</h5>
                <div class="article-meta">
                    <span><i class="fas fa-tag"></i> ${article.category}</span>
                    <span><i class="fas fa-eye"></i> ${article.views || 0} views</span>
                    <span><i class="far fa-calendar"></i> ${formatDate(article.createdAt)}</span>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = articlesHTML;
    console.log('✅ Top articles rendered');
}

// Articles Management
async function loadArticles(page = 1, search = '') {
    try {
        console.log('📝 Loading articles, page:', page, 'search:', search);
        showLoading('articles-tab');
        
        let url = `${API_BASE}/articles/admin/all?page=${page}&limit=10`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('📝 Articles response:', data);

        if (data.success) {
            renderArticles(data.articles, data.pagination);
        } else {
            throw new Error(data.message || 'Failed to load articles');
        }
    } catch (error) {
        console.error('❌ Articles load error:', error);
        showError('articles-tab', 'Failed to load articles');
    }
}

function renderArticles(articles, pagination) {
    const container = document.getElementById('articlesList');
    const paginationContainer = document.getElementById('articlesPagination');
    
    if (!container) return;
    
    if (!articles || articles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-newspaper"></i>
                <h4>No Articles Published</h4>
                <p>Start by creating your first article</p>
                <button class="btn btn-primary" onclick="switchTab('add-article')">
                    Create First Article
                </button>
            </div>
        `;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const articlesHTML = articles.map(article => `
        <div class="article-card-admin">
            <div class="article-header">
                <div class="article-info">
                    <h3 class="article-title">${article.title}</h3>
                    <div class="article-meta-admin">
                        <span class="article-category-admin">${article.category}</span>
                        <span>${formatDate(article.createdAt)}</span>
                        ${article.featured ? '<span class="featured-badge">Featured</span>' : ''}
                        ${!article.published ? '<span class="draft-badge">Draft</span>' : ''}
                    </div>
                    <div class="article-stats">
                        <span class="article-views-admin">
                            <i class="fas fa-eye"></i> ${article.views || 0} views
                        </span>
                    </div>
                </div>
                <div class="article-actions">
                    <button class="btn btn-outline btn-sm" onclick="editArticle('${article._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteArticle('${article._id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = articlesHTML;
    
    // Render pagination
    if (paginationContainer && pagination) {
        let paginationHTML = '<div class="pagination-controls">';
        
        if (pagination.currentPage > 1) {
            paginationHTML += `<button class="btn btn-outline btn-sm" onclick="loadArticles(${pagination.currentPage - 1})">Previous</button>`;
        }
        
        paginationHTML += `<span>Page ${pagination.currentPage} of ${pagination.totalPages}</span>`;
        
        if (pagination.currentPage < pagination.totalPages) {
            paginationHTML += `<button class="btn btn-outline btn-sm" onclick="loadArticles(${pagination.currentPage + 1})">Next</button>`;
        }
        
        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;
    }
}

// Article Search
function handleArticleSearch() {
    const searchInput = document.getElementById('articleSearch');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    loadArticles(1, searchTerm);
}

// Article Form Handling
function handleImagePreview(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('previewImage');
    const previewContainer = document.getElementById('imagePreview');

    if (file && preview && previewContainer) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function removeImagePreview() {
    const fileInput = document.getElementById('articleImage');
    const previewContainer = document.getElementById('imagePreview');
    const preview = document.getElementById('previewImage');
    
    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (preview) preview.src = '';
}

async function handleArticleSubmit(e) {
    e.preventDefault();
    const publishButton = document.getElementById('publishButton');
    const messageDiv = document.getElementById('articleMessage');

    const formData = {
        title: document.getElementById('articleTitle').value,
        category: document.getElementById('articleCategory').value,
        content: document.getElementById('articleContent').value,
        featured: document.getElementById('featuredArticle').checked,
        published: document.getElementById('publishArticle').checked
    };

    // Validation
    if (!formData.title || !formData.category || !formData.content) {
        if (messageDiv) {
            messageDiv.textContent = 'Please fill in all required fields';
            messageDiv.className = 'message error';
        }
        return;
    }

    try {
        if (publishButton) {
            publishButton.disabled = true;
            publishButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';
        }

        // Handle image upload if present
        const imageFile = document.getElementById('articleImage').files[0];
        if (imageFile) {
            const imageFormData = new FormData();
            imageFormData.append('image', imageFile);

            const uploadResponse = await fetch(`${API_BASE}/upload/image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                body: imageFormData
            });

            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok) {
                throw new Error(uploadData.message || 'Image upload failed');
            }

            formData.image = uploadData.imageUrl;
        }

        // Create article
        const response = await fetch(`${API_BASE}/articles`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('Article published successfully!', 'success');
            document.getElementById('addArticleForm').reset();
            removeImagePreview();
            if (messageDiv) {
                messageDiv.textContent = 'Article published successfully!';
                messageDiv.className = 'message success';
            }
            
            // Switch to articles tab to see the new article
            setTimeout(() => switchTab('articles'), 1000);
        } else {
            throw new Error(data.message || 'Failed to publish article');
        }
    } catch (error) {
        console.error('Article publish error:', error);
        if (messageDiv) {
            messageDiv.textContent = error.message || 'Failed to publish article';
            messageDiv.className = 'message error';
        }
        showToast('Failed to publish article', 'error');
    } finally {
        if (publishButton) {
            publishButton.disabled = false;
            publishButton.innerHTML = '<i class="fas fa-paper-plane"></i> Publish Article';
        }
    }
}

// Subscribers Management
async function loadSubscribers() {
    try {
        console.log('👥 Loading subscribers...');
        showLoading('subscribers-tab');
        
        const response = await fetch(`${API_BASE}/subscribers`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('👥 Subscribers response:', data);

        if (data.success) {
            renderSubscribers(data.subscribers);
        } else {
            throw new Error(data.message || 'Failed to load subscribers');
        }
    } catch (error) {
        console.error('❌ Subscribers load error:', error);
        showError('subscribers-tab', 'Failed to load subscribers');
    }
}

function renderSubscribers(subscribers) {
    const container = document.getElementById('subscribersList');
    if (!container) return;

    if (!subscribers || subscribers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h4>No Subscribers Yet</h4>
                <p>Subscribers will appear here when people sign up for your newsletter</p>
            </div>
        `;
        return;
    }

    const subscribersHTML = subscribers.map(subscriber => `
        <div class="subscriber-item">
            <div class="subscriber-header">
                <div class="subscriber-email">${subscriber.email}</div>
                <div class="subscriber-date">Subscribed: ${formatDate(subscriber.createdAt)}</div>
            </div>
            <div class="subscriber-actions">
                <span class="status-badge ${subscriber.active ? 'active' : 'inactive'}">
                    ${subscriber.active ? 'Active' : 'Inactive'}
                </span>
            </div>
        </div>
    `).join('');

    container.innerHTML = subscribersHTML;
}

// Contacts Management
async function loadContacts() {
    try {
        console.log('📧 Loading contacts...');
        showLoading('contacts-tab');
        
        const response = await fetch(`${API_BASE}/contacts`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('📧 Contacts response:', data);

        if (data.success) {
            renderContacts(data.contacts);
        } else {
            throw new Error(data.message || 'Failed to load contacts');
        }
    } catch (error) {
        console.error('❌ Contacts load error:', error);
        showError('contacts-tab', 'Failed to load contacts');
    }
}

function renderContacts(contacts) {
    const container = document.getElementById('contactsList');
    if (!container) return;

    if (!contacts || contacts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-envelope"></i>
                <h4>No Contact Messages</h4>
                <p>Contact form submissions will appear here</p>
            </div>
        `;
        return;
    }

    const contactsHTML = contacts.map(contact => `
        <div class="contact-item ${contact.read ? 'read' : 'unread'}">
            <div class="contact-header">
                <div>
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-email">${contact.email}</div>
                    <div class="contact-subject">${contact.subject}</div>
                </div>
                <div class="contact-date">${formatDate(contact.createdAt)}</div>
            </div>
            <div class="contact-message">${contact.message}</div>
            <div class="contact-actions">
                <span class="status-badge ${contact.read ? 'read' : 'unread'}">
                    ${contact.read ? 'Read' : 'Unread'}
                </span>
                ${!contact.read ? `
                    <button class="btn btn-outline btn-sm" onclick="markContactAsRead('${contact._id}')">
                        Mark as Read
                    </button>
                ` : ''}
                <button class="btn btn-secondary btn-sm" onclick="deleteContact('${contact._id}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = contactsHTML;
}

// Comments Management
async function loadComments(filter = 'all') {
    try {
        console.log('💬 Loading comments, filter:', filter);
        showLoading('comments-tab');
        
        let url = `${API_BASE}/comments`;
        if (filter !== 'all') {
            url += `?approved=${filter === 'approved'}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('💬 Comments response:', data);

        if (data.success) {
            renderComments(data.comments, filter);
        } else {
            throw new Error(data.message || 'Failed to load comments');
        }
    } catch (error) {
        console.error('❌ Comments load error:', error);
        showError('comments-tab', 'Failed to load comments');
    }
}

function renderComments(comments, filter) {
    const container = document.getElementById('commentsList');
    if (!container) return;
    
    if (!comments || comments.length === 0) {
        let message = 'No comments yet';
        if (filter === 'pending') message = 'No pending comments';
        else if (filter === 'approved') message = 'No approved comments';
        
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <h4>${message}</h4>
                <p>Comments will appear here when users start engaging</p>
            </div>
        `;
        return;
    }

    const commentsHTML = comments.map(comment => `
        <div class="comment-item ${comment.approved ? 'approved' : 'pending'}">
            <div class="comment-header">
                <div>
                    <div class="comment-author">${comment.user}</div>
                    <div class="comment-email">${comment.email}</div>
                    <div class="comment-article">Article: ${comment.article?.title || 'Unknown Article'}</div>
                </div>
                <div class="comment-date">${formatDate(comment.createdAt)}</div>
            </div>
            <div class="comment-text">${comment.text}</div>
            <div class="comment-actions">
                <span class="status-badge ${comment.approved ? 'approved' : 'pending'}">
                    ${comment.approved ? 'Approved' : 'Pending Approval'}
                </span>
                ${!comment.approved ? `
                    <button class="btn btn-primary btn-sm" onclick="approveComment('${comment._id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                ` : ''}
                <button class="btn btn-secondary btn-sm" onclick="deleteComment('${comment._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = commentsHTML;
}

// Utility Functions
function showLoading(tabId) {
    const tab = document.getElementById(tabId);
    if (tab) {
        const existingSpinner = tab.querySelector('.loading-spinner');
        if (!existingSpinner) {
            tab.insertAdjacentHTML('beforeend', `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading...</p>
                </div>
            `);
        }
    }
}

function hideLoading(tabId) {
    const tab = document.getElementById(tabId);
    if (tab) {
        const spinner = tab.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
}

function showError(tabId, message) {
    const tab = document.getElementById(tabId);
    if (tab) {
        tab.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Error Loading Data</h4>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="switchTab('${tabId.replace('-tab', '')}')">
                    Try Again
                </button>
            </div>
        `;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 5000);
    }
}

// Initialize dashboard data
function loadDashboardData() {
    console.log('🚀 INITIAL: Loading dashboard data...');
    loadAnalytics();
}

// Fallback function for basic dashboard
async function loadBasicDashboard() {
    console.log('🔄 Loading basic dashboard without analytics...');
    
    try {
        // Get basic counts without analytics
        const [articlesRes, subscribersRes, commentsRes, contactsRes] = await Promise.all([
            fetch(`${API_BASE}/articles/admin/all?page=1&limit=5`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            fetch(`${API_BASE}/subscribers`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            fetch(`${API_BASE}/comments`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            fetch(`${API_BASE}/contacts`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
        ]);

        const articlesData = await articlesRes.json();
        const subscribersData = await subscribersRes.json();
        const commentsData = await commentsRes.json();
        const contactsData = await contactsRes.json();

        // Render basic stats
        const statsGrid = document.getElementById('statsGrid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="stat-card">
                    <i class="fas fa-newspaper"></i>
                    <div class="stat-number">${articlesData.articles?.length || 0}</div>
                    <div class="stat-label">Total Articles</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-users"></i>
                    <div class="stat-number">${subscribersData.subscribers?.length || 0}</div>
                    <div class="stat-label">Subscribers</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-comments"></i>
                    <div class="stat-number">${commentsData.comments?.length || 0}</div>
                    <div class="stat-label">Comments</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-envelope"></i>
                    <div class="stat-number">${contactsData.contacts?.length || 0}</div>
                    <div class="stat-label">Contacts</div>
                </div>
            `;
        }

        // Show message about analytics
        showToast('Analytics data will appear after you publish articles', 'info');
        
    } catch (error) {
        console.error('❌ Basic dashboard failed:', error);
        showError('dashboard-tab', 'Dashboard data unavailable. Please publish some articles first.');
    }
}

// REAL FUNCTIONALITY - REPLACE THE PLACEHOLDER FUNCTIONS:

window.approveComment = async function(commentId) {
    try {
        const response = await fetch(`${API_BASE}/comments/${commentId}/approve`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('Comment approved successfully!', 'success');
            // Reload comments to reflect changes
            setTimeout(() => loadComments(), 1000);
        } else {
            throw new Error(data.message || 'Failed to approve comment');
        }
    } catch (error) {
        console.error('Approve comment error:', error);
        showToast('Failed to approve comment', 'error');
    }
};

window.deleteComment = async function(commentId) {
    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) return;
    
    try {
        const response = await fetch(`${API_BASE}/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('Comment deleted successfully!', 'success');
            // Reload comments to reflect changes
            setTimeout(() => loadComments(), 1000);
        } else {
            throw new Error(data.message || 'Failed to delete comment');
        }
    } catch (error) {
        console.error('Delete comment error:', error);
        showToast('Failed to delete comment', 'error');
    }
};

window.markContactAsRead = async function(contactId) {
    try {
        const response = await fetch(`${API_BASE}/contacts/${contactId}/read`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('Contact marked as read!', 'success');
            // Reload contacts to reflect changes
            setTimeout(() => loadContacts(), 1000);
        } else {
            throw new Error(data.message || 'Failed to mark contact as read');
        }
    } catch (error) {
        console.error('Mark contact as read error:', error);
        showToast('Failed to mark contact as read', 'error');
    }
};

window.deleteContact = async function(contactId) {
    if (!confirm('Are you sure you want to delete this contact message? This action cannot be undone.')) return;
    
    try {
        const response = await fetch(`${API_BASE}/contacts/${contactId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('Contact message deleted successfully!', 'success');
            // Reload contacts to reflect changes
            setTimeout(() => loadContacts(), 1000);
        } else {
            throw new Error(data.message || 'Failed to delete contact message');
        }
    } catch (error) {
        console.error('Delete contact error:', error);
        showToast('Failed to delete contact message', 'error');
    }
};

window.editArticle = async function(articleId) {
    showToast('Edit article functionality will be implemented in the next update!', 'info');
};

window.deleteArticle = async function(articleId) {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) return;
    
    try {
        const response = await fetch(`${API_BASE}/articles/${articleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('Article deleted successfully!', 'success');
            // Reload articles to reflect changes
            setTimeout(() => loadArticles(), 1000);
        } else {
            throw new Error(data.message || 'Failed to delete article');
        }
    } catch (error) {
        console.error('Delete article error:', error);
        showToast('Failed to delete article', 'error');
    }
};

console.log('🎉 ADMIN.JS INITIALIZATION COMPLETE');
console.log('=== NEXT STEPS ===');
console.log('1. Try to login with admin/admin123');
console.log('2. Check browser console for detailed logs');
console.log('3. Look for any red error messages');