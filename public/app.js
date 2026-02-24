// ================== GLOBAL VARIABLES ==================
const API_BASE = '/api'; // Karena di Vercel satu domain
let currentPage = 'home';
let searchCurrentPage = 1;
let searchTotalPages = 1;
let searchQuery = '';
let currentDetailUrl = '';
let currentWatchUrl = '';
let currentServers = [];
let currentSlide = 0;
let slideInterval;
let heroSlides = [];

// ================== DOM ELEMENTS ==================
// Loading
const loadingScreen = document.getElementById('loadingScreen');

// Navbar
const navbar = document.getElementById('navbar');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const searchIcon = document.getElementById('searchIcon');
const searchInput = document.getElementById('searchInput');
const searchBox = document.getElementById('searchBox');
const navLinks = document.querySelectorAll('.nav-link, .mobile-link');

// Pages
const pages = {
    home: document.getElementById('homePage'),
    search: document.getElementById('searchPage'),
    detail: document.getElementById('detailPage'),
    watch: document.getElementById('watchPage')
};

// Home page elements
const heroSlider = document.getElementById('heroSlider');
const heroIndicators = document.getElementById('heroIndicators');
const trendingGrid = document.getElementById('trendingGrid');
const latestGrid = document.getElementById('latestGrid');
const seriesGrid = document.getElementById('seriesGrid');

// Search page elements
const searchQuerySpan = document.getElementById('searchQuery');
const searchGrid = document.getElementById('searchGrid');
const searchPrevBtn = document.getElementById('searchPrevPage');
const searchNextBtn = document.getElementById('searchNextPage');
const searchPageInfo = document.getElementById('searchPageInfo');

// Detail page elements
const detailBackdrop = document.getElementById('detailBackdrop');
const detailPoster = document.getElementById('detailPoster');
const detailTitleLarge = document.getElementById('detailTitleLarge');
const detailYear = document.getElementById('detailYear');
const detailRating = document.getElementById('detailRating');
const detailDuration = document.getElementById('detailDuration');
const detailGenre = document.getElementById('detailGenre');
const detailDescription = document.getElementById('detailDescription');
const watchNowBtn = document.getElementById('watchNowBtn');
const episodesSection = document.getElementById('episodesSection');
const episodesGrid = document.getElementById('episodesGrid');

// Watch page elements
const watchTitle = document.getElementById('watchTitle');
const videoPlayer = document.getElementById('videoPlayer');
const serverList = document.getElementById('serverList');
const downloadList = document.getElementById('downloadList');

// Error modal
const errorModal = document.getElementById('errorModal');
const errorMessage = document.getElementById('errorMessage');

// ================== UTILITY FUNCTIONS ==================

// Show loading
function showLoading() {
    loadingScreen.classList.remove('hide');
}

// Hide loading
function hideLoading() {
    loadingScreen.classList.add('hide');
}

// Show error
function showError(message) {
    errorMessage.textContent = message || 'Terjadi kesalahan, coba lagi nanti!';
    errorModal.classList.add('show');
}

// Close error modal (exposed to global)
window.closeModal = function() {
    errorModal.classList.remove('show');
};

// Navigate to page
function navigateTo(page, data = {}) {
    // Hide all pages
    Object.values(pages).forEach(p => p.classList.remove('active'));
    
    // Show selected page
    if (pages[page]) {
        pages[page].classList.add('active');
        currentPage = page;
    }
    
    // Update URL params without reload
    const url = new URL(window.location);
    url.searchParams.delete('page');
    if (page === 'search' && data.q) {
        url.searchParams.set('search', data.q);
        if (data.page) url.searchParams.set('page', data.page);
    } else if (page === 'detail' && data.url) {
        url.searchParams.set('url', data.url);
    } else if (page === 'watch' && data.url) {
        url.searchParams.set('watch', data.url);
    } else if (page === 'home') {
        url.searchParams.delete('search');
        url.searchParams.delete('url');
        url.searchParams.delete('watch');
        url.searchParams.delete('page');
    }
    window.history.pushState({}, '', url);
    
    // Update active nav links
    navLinks.forEach(link => {
        const linkPage = link.dataset.page;
        if (linkPage === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Close mobile menu if open
    mobileMenu.classList.remove('show');
}

// Go back (exposed to global)
window.goBack = function() {
    if (currentPage === 'detail' || currentPage === 'watch' || currentPage === 'search') {
        navigateTo('home');
    } else {
        window.history.back();
    }
};

// Check URL params on load
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('search')) {
        const query = params.get('search');
        const page = params.get('page') || 1;
        if (query) {
            searchInput.value = query;
            performSearch(query, parseInt(page));
        }
    } else if (params.has('url')) {
        const url = params.get('url');
        if (url) {
            loadDetailData(url);
        }
    } else if (params.has('watch')) {
        const url = params.get('watch');
        if (url) {
            loadWatchData(url);
        }
    } else {
        loadHomeData();
    }
}

// API fetch helper
async function fetchAPI(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API fetch error:', error);
        showError('Gagal connect ke API, cek koneksi lo bro!');
        return { success: false, error: error.message };
    }
}

// ================== HOME PAGE FUNCTIONS ==================

// Load home data
async function loadHomeData() {
    showLoading();
    
    const result = await fetchAPI('/home');
    
    if (result.success && result.data) {
        const data = result.data;
        
        // Render hero slider
        if (data.featured && data.featured.length > 0) {
            renderHeroSlider(data.featured);
        } else {
            // Fallback pake trending kalo gada featured
            renderHeroSlider(data.trending.slice(0, 5));
        }
        
        // Render grids
        renderMovieGrid(trendingGrid, data.trending);
        renderMovieGrid(latestGrid, data.latest);
        renderMovieGrid(seriesGrid, data.series);
    } else {
        showError('Gagal load data homepage');
    }
    
    hideLoading();
}

// Render hero slider
function renderHeroSlider(slides) {
    heroSlides = slides;
    if (!heroSlides.length) return;
    
    let slidesHTML = '';
    let indicatorsHTML = '';
    
    heroSlides.forEach((slide, index) => {
        slidesHTML += `
            <div class="hero-slide ${index === 0 ? 'active' : ''}" style="background-image: url('${slide.image || slide.poster}')">
                <div class="slide-content">
                    <h2 class="slide-title">${slide.title || 'Movie Title'}</h2>
                    <p class="slide-description">${slide.description || slide.overview || 'No description available'}</p>
                    <button class="slide-btn" onclick="navigateToDetail('${slide.url}')">
                        <i class="fas fa-play"></i> Watch Now
                    </button>
                </div>
            </div>
        `;
        
        indicatorsHTML += `<div class="indicator ${index === 0 ? 'active' : ''}" onclick="slideTo(${index})"></div>`;
    });
    
    heroSlider.innerHTML = slidesHTML;
    heroIndicators.innerHTML = indicatorsHTML;
    
    // Start auto slide
    startSlideShow();
}

// Slide to specific index (exposed to global)
window.slideTo = function(index) {
    if (index < 0) index = heroSlides.length - 1;
    if (index >= heroSlides.length) index = 0;
    
    // Update slides
    document.querySelectorAll('.hero-slide').forEach((slide, i) => {
        if (i === index) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });
    
    // Update indicators
    document.querySelectorAll('.indicator').forEach((ind, i) => {
        if (i === index) {
            ind.classList.add('active');
        } else {
            ind.classList.remove('active');
        }
    });
    
    currentSlide = index;
};

// Start slideshow
function startSlideShow() {
    if (slideInterval) clearInterval(slideInterval);
    slideInterval = setInterval(() => {
        slideTo(currentSlide + 1);
    }, 5000);
}

// Render movie grid
function renderMovieGrid(container, movies) {
    if (!movies || movies.length === 0) {
        container.innerHTML = '<p class="no-results">Gada film nih, kosong bro 🥲</p>';
        return;
    }
    
    let html = '';
    movies.forEach(movie => {
        html += `
            <div class="movie-card" onclick="navigateToDetail('${movie.url}')">
                <div class="movie-card-image">
                    <img src="${movie.image || movie.poster}" alt="${movie.title}" loading="lazy">
                    <div class="movie-quality">${movie.quality || 'HD'}</div>
                    <div class="movie-card-overlay">
                        <h3 class="movie-card-title">${movie.title}</h3>
                        <p class="movie-card-year">${movie.year || '2024'}</p>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ================== SEARCH FUNCTIONS ==================

// Perform search
async function performSearch(query, page = 1) {
    if (!query.trim()) return;
    
    showLoading();
    searchQuery = query;
    searchCurrentPage = page;
    
    const result = await fetchAPI('/search', { q: query, page });
    
    if (result.success && result.data) {
        const data = result.data;
        searchTotalPages = data.totalPages || 1;
        searchQuerySpan.textContent = query;
        
        // Render results
        renderSearchGrid(data.results);
        
        // Update pagination
        updateSearchPagination();
        
        // Navigate to search page
        navigateTo('search', { q: query, page });
    } else {
        showError('Gagal search, coba kata kunci lain bro!');
    }
    
    hideLoading();
}

// Render search grid
function renderSearchGrid(results) {
    if (!results || results.length === 0) {
        searchGrid.innerHTML = '<p class="no-results">Gada hasil buat pencarian lo, coba kata lain 🥲</p>';
        return;
    }
    
    let html = '';
    results.forEach(movie => {
        html += `
            <div class="movie-card" onclick="navigateToDetail('${movie.url}')">
                <div class="movie-card-image">
                    <img src="${movie.image}" alt="${movie.title}" loading="lazy">
                    <div class="movie-card-overlay">
                        <h3 class="movie-card-title">${movie.title}</h3>
                        <p class="movie-card-year">${movie.year || 'N/A'}</p>
                    </div>
                </div>
            </div>
        `;
    });
    
    searchGrid.innerHTML = html;
}

// Update search pagination
function updateSearchPagination() {
    searchPageInfo.textContent = `Page ${searchCurrentPage} of ${searchTotalPages}`;
    
    searchPrevBtn.disabled = searchCurrentPage <= 1;
    searchNextBtn.disabled = searchCurrentPage >= searchTotalPages;
}

// Change search page (exposed to global)
window.changeSearchPage = function(direction) {
    let newPage = searchCurrentPage;
    
    if (direction === 'prev' && newPage > 1) {
        newPage--;
    } else if (direction === 'next' && newPage < searchTotalPages) {
        newPage++;
    } else {
        return;
    }
    
    performSearch(searchQuery, newPage);
};

// ================== DETAIL PAGE FUNCTIONS ==================

// Navigate to detail (exposed to global)
window.navigateToDetail = function(url) {
    if (!url) return;
    currentDetailUrl = url;
    loadDetailData(url);
};

// Load detail data
async function loadDetailData(url) {
    showLoading();
    
    const result = await fetchAPI('/detail', { url });
    
    if (result.success && result.data) {
        const data = result.data;
        
        // Set backdrop
        detailBackdrop.style.backgroundImage = `url('${data.backdrop || data.poster}')`;
        
        // Set poster
        detailPoster.src = data.poster || '';
        detailPoster.alt = data.title;
        
        // Set info
        detailTitleLarge.textContent = data.title;
        detailYear.textContent = data.year || 'N/A';
        detailRating.innerHTML = `<i class="fas fa-star"></i> ${data.rating || 'N/A'}`;
        detailDuration.textContent = data.duration || 'N/A';
        detailGenre.textContent = data.genre || 'N/A';
        detailDescription.textContent = data.description || 'No description available';
        
        // Set watch button
        watchNowBtn.onclick = () => navigateToWatch(url);
        
        // Handle episodes for series
        if (data.type === 'series' && data.episodes && data.episodes.length > 0) {
            episodesSection.style.display = 'block';
            renderEpisodes(data.episodes);
        } else {
            episodesSection.style.display = 'none';
        }
        
        // Navigate to detail page
        navigateTo('detail', { url });
    } else {
        showError('Gagal load detail, mungkin URL-nya salah bro!');
    }
    
    hideLoading();
}

// Render episodes
function renderEpisodes(episodes) {
    let html = '';
    episodes.forEach((ep, index) => {
        html += `
            <div class="episode-item" onclick="navigateToWatch('${ep.url}')">
                <div class="episode-image">
                    <img src="${ep.image || 'https://via.placeholder.com/300x200'}" alt="${ep.title}">
                </div>
                <div class="episode-info">
                    <h4>${ep.title}</h4>
                    <p>Episode ${ep.episode || index + 1}</p>
                </div>
            </div>
        `;
    });
    
    episodesGrid.innerHTML = html;
}

// ================== WATCH PAGE FUNCTIONS ==================

// Navigate to watch (exposed to global)
window.navigateToWatch = function(url) {
    if (!url) return;
    currentWatchUrl = url;
    loadWatchData(url);
};

// Load watch data
async function loadWatchData(url) {
    showLoading();
    
    const result = await fetchAPI('/watch', { url });
    
    if (result.success && result.data) {
        const data = result.data;
        currentServers = data.servers || [];
        
        // Set title
        watchTitle.textContent = 'Now Playing';
        
        // Set first server if available
        if (currentServers.length > 0) {
            setupVideoPlayer(currentServers[0].url);
        } else {
            // Fallback: maybe langsung embed dari URL
            setupVideoPlayer(url);
        }
        
        // Render server list
        renderServerList(currentServers);
        
        // Render download links
        renderDownloadList(data.downloads || []);
        
        // Navigate to watch page
        navigateTo('watch', { url });
    } else {
        showError('Gagal load video, mungkin link-nya udah mati bro!');
    }
    
    hideLoading();
}

// Setup video player
function setupVideoPlayer(url) {
    // Clean URL untuk iframe
    let iframeUrl = url;
    
    // Handle berbagai format URL
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        // Extract YouTube ID
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
        if (match) {
            iframeUrl = `https://www.youtube.com/embed/${match[1]}`;
        }
    } else if (url.includes('vimeo.com')) {
        // Extract Vimeo ID
        const match = url.match(/vimeo\.com\/(\d+)/);
        if (match) {
            iframeUrl = `https://player.vimeo.com/video/${match[1]}`;
        }
    } else if (!url.includes('http')) {
        // If relative URL, add base
        iframeUrl = `https:${url}`;
    }
    
    videoPlayer.src = iframeUrl;
}

// Render server list
function renderServerList(servers) {
    if (!servers || servers.length === 0) {
        serverList.innerHTML = '<p class="no-servers">Gada server available, sorry bro 😢</p>';
        return;
    }
    
    let html = '';
    servers.forEach((server, index) => {
        html += `
            <button class="server-btn ${index === 0 ? 'active' : ''}" onclick="switchServer('${server.url}', this)">
                ${server.name || `Server ${index + 1}`}
            </button>
        `;
    });
    
    serverList.innerHTML = html;
}

// Switch server (exposed to global)
window.switchServer = function(url, btn) {
    // Remove active class from all server buttons
    document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
    
    // Add active class to clicked button
    if (btn) btn.classList.add('active');
    
    // Setup video player with new URL
    setupVideoPlayer(url);
};

// Render download links
function renderDownloadList(downloads) {
    if (!downloads || downloads.length === 0) {
        downloadList.innerHTML = '<p class="no-downloads">Gada link download, nonton aja langsung bro</p>';
        return;
    }
    
    let html = '';
    downloads.forEach(link => {
        html += `
            <a href="${link.url}" class="download-link" target="_blank">
                <i class="fas fa-download"></i> ${link.quality || 'Download'}
            </a>
        `;
    });
    
    downloadList.innerHTML = html;
}

// ================== EVENT LISTENERS ==================

// Scroll event for navbar
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile menu toggle
mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('show');
});

// Search functionality
searchIcon.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
        searchBox.classList.toggle('active');
        if (searchBox.classList.contains('active')) {
            searchInput.focus();
        }
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            performSearch(query, 1);
        }
    }
});

// Navigation links
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) {
            if (page === 'home') {
                navigateTo('home');
                loadHomeData();
            } else if (page === 'movies') {
                // TODO: Implement movies category
                showError('Movies page coming soon!');
            } else if (page === 'series') {
                // TODO: Implement series category
                showError('Series page coming soon!');
            } else if (page === 'trending') {
                // TODO: Implement trending page
                showError('Trending page coming soon!');
            }
        }
    });
});

// Back button browser
window.addEventListener('popstate', () => {
    checkUrlParams();
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Hide loading after a moment
    setTimeout(() => {
        hideLoading();
    }, 1000);
    
    // Check URL params
    checkUrlParams();
});

// ================== EXPOSE GLOBAL FUNCTIONS ==================
// (Already exposed via window.functionName above)