// api/index.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const BASE_URL = 'https://themoviebox.org';
const PROXY_URL = 'https://cors.caliph.my.id/?url=';

// Helper fetch pake proxy biar aman dari CORS block
const fetchWithProxy = async (url) => {
  try {
    const response = await axios.get(PROXY_URL + encodeURIComponent(url), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });
    return response.data;
  } catch (error) {
    console.error('Proxy fetch error:', error.message);
    throw error;
  }
};

// ================== FUNGSI SCRAPING ==================

// Scrape homepage: trending, latest, series
const getHomepage = async () => {
  try {
    const html = await fetchWithProxy(BASE_URL);
    const $ = cheerio.load(html);
    
    const trending = [];
    const latest = [];
    const series = [];
    const featured = [];

    // Ambil trending movies (biasanya di slider atau section pertama)
    $('.trending-movies .movie-item, .slider .item, .movie-card').each((i, el) => {
      if (i < 10) {
        const title = $(el).find('.title, h3, .name').text().trim() || 'Unknown';
        const image = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
        const link = $(el).find('a').attr('href') || '';
        const quality = $(el).find('.quality').text().trim() || 'HD';
        const year = $(el).find('.year').text().trim() || '2024';
        
        trending.push({
          title,
          image: image.startsWith('http') ? image : `https:${image}`,
          url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
          quality,
          year
        });
      }
    });

    // Ambil latest movies
    $('.latest-movies .movie-item, .releases .item, .film-item').each((i, el) => {
      if (i < 10) {
        const title = $(el).find('.title, h3, .name').text().trim() || 'Unknown';
        const image = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
        const link = $(el).find('a').attr('href') || '';
        
        latest.push({
          title,
          image: image.startsWith('http') ? image : `https:${image}`,
          url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
          type: 'movie'
        });
      }
    });

    // Ambil series
    $('.tv-series .movie-item, .series-item, .show-item').each((i, el) => {
      if (i < 10) {
        const title = $(el).find('.title, h3, .name').text().trim() || 'Unknown';
        const image = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
        const link = $(el).find('a').attr('href') || '';
        
        series.push({
          title,
          image: image.startsWith('http') ? image : `https:${image}`,
          url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
          type: 'series'
        });
      }
    });

    // Featured (hero slider)
    $('.featured-slider .slide, .hero-slider .item').each((i, el) => {
      if (i < 5) {
        const title = $(el).find('.title, h2').text().trim() || 'Featured';
        const description = $(el).find('.description, p').text().trim() || '';
        const image = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
        const link = $(el).find('a').attr('href') || '';
        
        featured.push({
          title,
          description,
          image: image.startsWith('http') ? image : `https:${image}`,
          url: link.startsWith('http') ? link : `${BASE_URL}${link}`
        });
      }
    });

    return { trending, latest, series, featured };
  } catch (error) {
    console.error('Homepage scrape error:', error);
    return { trending: [], latest: [], series: [], featured: [] };
  }
};

// Search movies dengan pagination
const searchMovies = async (query, page = 1) => {
  try {
    const searchUrl = `${BASE_URL}/search/${encodeURIComponent(query)}/page/${page}`;
    const html = await fetchWithProxy(searchUrl);
    const $ = cheerio.load(html);
    
    const results = [];
    $('.movies-list .item, .search-results .movie-item, .film-item').each((i, el) => {
      const title = $(el).find('.title, h3, .name').text().trim() || 'Unknown';
      const image = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
      const link = $(el).find('a').attr('href') || '';
      const year = $(el).find('.year').text().trim() || 'N/A';
      
      results.push({
        title,
        image: image.startsWith('http') ? image : `https:${image}`,
        url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
        year
      });
    });

    // Cari total pages
    let totalPages = 1;
    $('.pagination a').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        const match = href.match(/page\/(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > totalPages) totalPages = num;
        }
      }
    });

    return {
      results,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      query
    };
  } catch (error) {
    console.error('Search error:', error);
    return { results: [], currentPage: 1, totalPages: 1, hasNextPage: false, query };
  }
};

// Get detail movie/series
const getDetail = async (url) => {
  try {
    const html = await fetchWithProxy(url);
    const $ = cheerio.load(html);
    
    const title = $('h1, .title, .movie-title').first().text().trim() || 'Unknown';
    const description = $('.description, .sinopsis, .movie-description').text().trim() || 'No description';
    const poster = $('.poster img, .cover img, .movie-poster img').attr('src') || '';
    const backdrop = $('.backdrop img, .background img').attr('src') || poster;
    const year = $('.year, .release-date').text().trim() || 'N/A';
    const genre = $('.genre, .categories').text().trim() || 'N/A';
    const rating = $('.rating, .imdb-rating').text().trim() || 'N/A';
    const duration = $('.duration, .runtime').text().trim() || 'N/A';
    
    // Cek tipe (series atau movie)
    const isSeries = $('.episodes-list, .episodes, .season-tabs').length > 0;
    
    const episodes = [];
    if (isSeries) {
      $('.episode-item, .episode-card, .episode').each((i, el) => {
        const epTitle = $(el).find('.ep-title, .name').text().trim() || `Episode ${i+1}`;
        const epUrl = $(el).find('a').attr('href') || '';
        const epImage = $(el).find('img').attr('src') || '';
        
        episodes.push({
          title: epTitle,
          url: epUrl.startsWith('http') ? epUrl : `${BASE_URL}${epUrl}`,
          image: epImage.startsWith('http') ? epImage : `https:${epImage}`,
          episode: i + 1
        });
      });
    }

    return {
      success: true,
      data: {
        title,
        description,
        poster: poster.startsWith('http') ? poster : `https:${poster}`,
        backdrop: backdrop.startsWith('http') ? backdrop : `https:${backdrop}`,
        year,
        genre,
        rating,
        duration,
        type: isSeries ? 'series' : 'movie',
        url,
        episodes
      }
    };
  } catch (error) {
    console.error('Detail error:', error);
    return { success: false, error: error.message };
  }
};

// Get streaming links
const getStreamingLinks = async (url) => {
  try {
    const html = await fetchWithProxy(url);
    const $ = cheerio.load(html);
    
    const servers = [];
    const downloadLinks = [];
    
    // Cari iframe servers
    $('.server-item, .server-link, .watch-server').each((i, el) => {
      const serverName = $(el).text().trim() || `Server ${i+1}`;
      const serverUrl = $(el).attr('data-url') || $(el).attr('href') || '';
      
      if (serverUrl) {
        servers.push({
          name: serverName,
          url: serverUrl.startsWith('http') ? serverUrl : `${BASE_URL}${serverUrl}`,
          type: 'iframe'
        });
      }
    });

    // Kalo gada server, coba ambil iframe langsung
    if (servers.length === 0) {
      $('iframe').each((i, el) => {
        const src = $(el).attr('src');
        if (src) {
          servers.push({
            name: `Server ${i+1}`,
            url: src,
            type: 'iframe'
          });
        }
      });
    }

    // Cari download links
    $('.download-link, .download-item a').each((i, el) => {
      const linkUrl = $(el).attr('href') || '';
      const quality = $(el).find('.quality').text().trim() || $(el).text().trim() || 'Unknown';
      
      if (linkUrl) {
        downloadLinks.push({
          url: linkUrl,
          quality,
          type: 'download'
        });
      }
    });

    return {
      success: true,
      data: {
        servers,
        downloads: downloadLinks,
        currentUrl: url
      }
    };
  } catch (error) {
    console.error('Streaming links error:', error);
    return { success: false, error: error.message };
  }
};

// ================== ROUTES API ==================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'MovieBox API is running smoothly bro! 🔥'
  });
});

// Homepage data
app.get('/api/home', async (req, res) => {
  try {
    const data = await getHomepage();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search movies/series
app.get('/api/search', async (req, res) => {
  const { q, page = 1 } = req.query;
  
  if (!q) {
    return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
  }
  
  try {
    const data = await searchMovies(q, parseInt(page));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get detail by URL
app.get('/api/detail', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL parameter is required' });
  }
  
  try {
    const result = await getDetail(url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get streaming links
app.get('/api/watch', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL parameter is required' });
  }
  
  try {
    const result = await getStreamingLinks(url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Catch-all untuk route yang gak dikenal
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found, cek lagi bro URL-nya! 🫠' 
  });
});

// Export untuk Vercel serverless
module.exports = app;